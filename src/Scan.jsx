import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";

function Scan() {

  const [message,setMessage] = useState("جارٍ التحقق...");
  const [needLogin,setNeedLogin] = useState(false);
  const [employeeCodeInput,setEmployeeCodeInput] = useState("");

  const hasRun = useRef(false);

  useEffect(()=>{

    if(hasRun.current) return;
    hasRun.current = true;

    handleScan();

  },[]);

  const getFingerprint = () => {

    let deviceId = localStorage.getItem("device_id");

    if(!deviceId){
      deviceId = crypto.randomUUID();
      localStorage.setItem("device_id",deviceId);
    }

    const userAgent = navigator.userAgent;
    const screenSize = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return deviceId + "_" + userAgent + "_" + screenSize + "_" + timezone;

  };

  const handleScan = async () => {

    try{

      const fingerprint = getFingerprint();

      const {data:knownEmployee} = await supabase
      .from("employees")
      .select("*")
      .eq("device_fingerprint",fingerprint)
      .maybeSingle();

      if(knownEmployee){
        registerAttendance(knownEmployee);
        return;
      }

      setNeedLogin(true);
      setMessage("");

    }catch(error){

      console.error(error);
      setMessage("❌ حدث خطأ في التحقق");

    }

  };

  const registerAttendance = async (employee) => {

    try{

      if(!navigator.geolocation){
        setMessage("❌ المتصفح لا يدعم تحديد الموقع");
        return;
      }

      const position = await new Promise((resolve,reject)=>{
        navigator.geolocation.getCurrentPosition(resolve,reject,{
          enableHighAccuracy:true
        });
      });

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      const gymLat = 30.851914;
      const gymLng = 31.453270;

      const getDistance = (lat1,lon1,lat2,lon2)=>{

        const R = 6371;

        const dLat = (lat2-lat1)*Math.PI/180;
        const dLon = (lon2-lon1)*Math.PI/180;

        const a =
        Math.sin(dLat/2)*Math.sin(dLat/2) +
        Math.cos(lat1*Math.PI/180) *
        Math.cos(lat2*Math.PI/180) *
        Math.sin(dLon/2)*Math.sin(dLon/2);

        const c = 2 * Math.atan2(Math.sqrt(a),Math.sqrt(1-a));

        return R*c;

      };

      const distance = getDistance(userLat,userLng,gymLat,gymLng);

      if(distance > 0.2){
        setMessage("❌ يجب أن تكون داخل الجيم");
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      const {data:lastRecord} = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id",employee.id)
      .eq("work_date",today)
      .order("check_in",{ascending:false})
      .limit(1)
      .maybeSingle();

      // تسجيل حضور
      if(!lastRecord){

        const nowISO = new Date().toISOString();

        const {error} = await supabase
        .from("attendance")
        .insert([{
          employee_id:employee.id,
          check_in:nowISO,
          work_date:today
        }]);

        if(error){
          console.error(error);
          setMessage("❌ فشل تسجيل الحضور");
          return;
        }

        setMessage(`✅ تم تسجيل حضور ${employee.full_name}`);
        return;

      }

      // يوجد حضور بدون انصراف
      if(!lastRecord.check_out){

        const nowISO = new Date().toISOString();

        const minutes =
        (new Date(nowISO) - new Date(lastRecord.check_in)) /
        (1000*60);

        if(minutes < 10){

          setMessage("⏱ لا يمكن تسجيل الانصراف قبل مرور 10 دقائق من تسجيل الحضور");
          return;

        }

        const diff =
        (new Date(nowISO) - new Date(lastRecord.check_in)) /
        (1000*60*60);

        const {error:updateError} = await supabase
        .from("attendance")
        .update({
          check_out:nowISO,
          total_hours:Number(diff.toFixed(2))
        })
        .eq("id",lastRecord.id);

        if(updateError){
          console.error(updateError);
          setMessage("❌ فشل تسجيل الانصراف");
          return;
        }

        setMessage(`✅ تم تسجيل انصراف ${employee.full_name}`);
        return;

      }

      // تم تسجيل اليوم
      setMessage("🚫 تم تسجيل حضور وانصراف اليوم بالفعل");

    }catch(error){

      console.error(error);
      setMessage("❌ حدث خطأ أثناء التسجيل");

    }

  };

  const firstLogin = async () => {

    try{

      const fingerprint = getFingerprint();

      const {data:employee} = await supabase
      .from("employees")
      .select("*")
      .eq("employee_code",employeeCodeInput)
      .maybeSingle();

      if(!employee){
        alert("❌ كود الموظف غير صحيح");
        return;
      }

      if(employee.device_fingerprint){
        alert("❌ هذا الموظف مسجل على جهاز آخر");
        return;
      }

      await supabase
      .from("employees")
      .update({
        device_fingerprint:fingerprint
      })
      .eq("id",employee.id);

      registerAttendance(employee);

    }catch(error){

      console.error(error);

    }

  };

  if(needLogin){

    return(

      <div style={{
        minHeight:"100vh",
        display:"flex",
        justifyContent:"center",
        alignItems:"center",
        flexDirection:"column",
        background:"#111",
        color:"#fff"
      }}>

        <h2>أدخل كود الموظف</h2>

        <input
        value={employeeCodeInput}
        onChange={(e)=>setEmployeeCodeInput(e.target.value)}
        placeholder="كود الموظف"
        style={{
          padding:"10px",
          fontSize:"18px",
          marginTop:"10px",
          color:"black"
        }}
        />

        <button
        onClick={firstLogin}
        style={{
          marginTop:"20px",
          padding:"10px 25px",
          fontSize:"18px",
          cursor:"pointer"
        }}
        >
        تسجيل الجهاز
        </button>

      </div>

    );

  }

  return(

    <div style={{
      minHeight:"100vh",
      display:"flex",
      justifyContent:"center",
      alignItems:"center",
      fontSize:"26px",
      fontWeight:"bold",
      textAlign:"center",
      background:"#111",
      color:"#fff"
    }}>
      {message}
    </div>

  );

}

export default Scan;