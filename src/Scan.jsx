import { useEffect, useState } from "react";
import { supabase } from "./supabase";

function Scan() {

  const [message,setMessage] = useState("جارى التحقق...");
  const [needCode,setNeedCode] = useState(false);
  const [code,setCode] = useState("");

  useEffect(()=>{
    checkDevice();
  },[]);

  // توليد بصمة الجهاز
  const getFingerprint = () => {

    let deviceId = localStorage.getItem("device_id");

    if(!deviceId){
      deviceId = crypto.randomUUID();
      localStorage.setItem("device_id",deviceId);
    }

    const ua = navigator.userAgent;
    const screen = window.screen.width + "x" + window.screen.height;

    return deviceId + "_" + ua + "_" + screen;

  };

  // فحص الجهاز
  const checkDevice = async () => {

    const fingerprint = getFingerprint();

    const {data} = await supabase
      .from("employees")
      .select("*")
      .eq("device_fingerprint",fingerprint)
      .single();

    if(data){
      registerAttendance(data);
    }else{
      setNeedCode(true);
      setMessage("");
    }

  };

  // تسجيل الجهاز أول مرة
  const registerDevice = async () => {

    const fingerprint = getFingerprint();

    const {data:employee,error} = await supabase
      .from("employees")
      .select("*")
      .eq("employee_code",code)
      .single();

    if(error || !employee){
      alert("الكود غير صحيح");
      return;
    }

    await supabase
      .from("employees")
      .update({device_fingerprint:fingerprint})
      .eq("id",employee.id);

    registerAttendance(employee);

  };

  // تسجيل حضور أو انصراف
  const registerAttendance = async (employee) => {

    const today = new Date().toISOString().split("T")[0];

    const {data:existing} = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id",employee.id)
      .eq("work_date",today)
      .is("check_out",null);

    if(!existing || existing.length===0){

      await supabase.from("attendance").insert([{
        employee_id:employee.id,
        check_in:new Date().toISOString(),
        work_date:today
      }]);

      setMessage("✅ تم تسجيل حضور " + employee.full_name);

    }else{

      const record = existing[0];
      const now = new Date().toISOString();

      const diff = (new Date(now) - new Date(record.check_in)) / 3600000;

      await supabase
      .from("attendance")
      .update({
        check_out:now,
        total_hours:Number(diff.toFixed(2))
      })
      .eq("id",record.id);

      setMessage("✅ تم تسجيل انصراف " + employee.full_name);

    }

  };

  // شاشة إدخال الكود أول مرة
  if(needCode){

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
          value={code}
          onChange={(e)=>setCode(e.target.value)}
          style={{
            padding:"10px",
            fontSize:"18px",
            marginTop:"10px"
          }}
        />

        <button
          onClick={registerDevice}
          style={{
            marginTop:"20px",
            padding:"10px 20px",
            fontSize:"18px",
            cursor:"pointer"
          }}
        >
          تسجيل الجهاز
        </button>

      </div>

    );

  }

  // شاشة الرسالة
  return(

    <div style={{
      minHeight:"100vh",
      display:"flex",
      justifyContent:"center",
      alignItems:"center",
      background:"#111",
      color:"#fff",
      fontSize:"26px",
      fontWeight:"bold"
    }}>
      {message}
    </div>

  );

}

export default Scan;