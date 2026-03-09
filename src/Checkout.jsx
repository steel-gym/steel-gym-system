import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";

function Checkout() {

  const [message,setMessage] = useState("جارٍ التحقق...");
  const [loading,setLoading] = useState(true);
  const [status,setStatus] = useState("normal");

  const hasRun = useRef(false);

  useEffect(()=>{

    if(hasRun.current) return;
    hasRun.current = true;

    handleCheckout();

  },[])

  const getFingerprint = ()=>{

    let deviceId = localStorage.getItem("device_id");

    if(!deviceId){
      deviceId = crypto.randomUUID();
      localStorage.setItem("device_id",deviceId);
    }

    const userAgent = navigator.userAgent;
    const screenSize = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return deviceId + "_" + userAgent + "_" + screenSize + "_" + timezone;

  }

  const handleCheckout = async ()=>{

    try{

      setLoading(true)

      const fingerprint = getFingerprint()

      const {data:employee} = await supabase
      .from("employees")
      .select("*")
      .eq("device_fingerprint",fingerprint)
      .maybeSingle()

      if(!employee){

        setStatus("error")
        setMessage("هذا الجهاز غير مسجل")
        setLoading(false)
        return

      }

      if(!navigator.geolocation){

        setStatus("error")
        setMessage("المتصفح لا يدعم تحديد الموقع")
        setLoading(false)
        return

      }

      const position = await new Promise((resolve,reject)=>{
        navigator.geolocation.getCurrentPosition(resolve,reject)
      })

      const userLat = position.coords.latitude
      const userLng = position.coords.longitude

      const gymLat = 30.851914
      const gymLng = 31.453270

      const getDistance=(lat1,lon1,lat2,lon2)=>{

        const R = 6371

        const dLat = ((lat2-lat1)*Math.PI)/180
        const dLon = ((lon2-lon1)*Math.PI)/180

        const a =
        Math.sin(dLat/2)**2 +
        Math.cos((lat1*Math.PI)/180) *
        Math.cos((lat2*Math.PI)/180) *
        Math.sin(dLon/2)**2

        const c = 2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))

        return R*c

      }

      const distance = getDistance(userLat,userLng,gymLat,gymLng)

      if(distance > 0.2){

        setStatus("error")
        setMessage("يجب أن تكون داخل الجيم")
        setLoading(false)
        return

      }

      const today = new Date().toISOString().split("T")[0]

      const {data:attendance} = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id",employee.id)
      .eq("work_date",today)
      .maybeSingle()

      if(!attendance){

        setStatus("error")
        setMessage("يجب تسجيل الحضور أولاً")
        setLoading(false)
        return

      }

      if(attendance.check_out){

        setStatus("error")
        setMessage("تم تسجيل الانصراف بالفعل")
        setLoading(false)
        return

      }

      const checkInTime = new Date(attendance.check_in)
      const now = new Date()

      const diffMinutes = (now - checkInTime) / 60000

      if(diffMinutes < 10){

        setStatus("error")
        setMessage("لا يمكن تسجيل الانصراف قبل 10 دقائق")
        setLoading(false)
        return

      }

      await supabase
      .from("attendance")
      .update({
        check_out:new Date().toISOString()
      })
      .eq("id",attendance.id)

      setStatus("success")
      setMessage("تم تسجيل الانصراف بنجاح")
      setLoading(false)

    }

    catch(error){

      console.error(error)

      setStatus("error")
      setMessage("حدث خطأ أثناء تسجيل الانصراف")
      setLoading(false)

    }

  }

  return(

    <div
    style={{
      minHeight:"100vh",
      display:"flex",
      flexDirection:"column",
      justifyContent:"center",
      alignItems:"center",
      background:"#0f172a",
      color:"#fff",
      textAlign:"center"
    }}
    >

    {loading && (

      <div style={{fontSize:"28px"}}>
      ⏳ جاري التحقق...
      </div>

    )}

    {!loading && status === "success" && (

      <div style={{fontSize:"60px",color:"#22c55e"}}>
      ✔
      <div style={{fontSize:"22px",marginTop:"10px"}}>
      {message}
      </div>
      </div>

    )}

    {!loading && status === "error" && (

      <div style={{fontSize:"60px",color:"#ef4444"}}>
      ✖
      <div style={{fontSize:"22px",marginTop:"10px"}}>
      {message}
      </div>
      </div>

    )}

    {!loading && status === "normal" && (

      <div style={{fontSize:"22px"}}>
      {message}
      </div>

    )}

    </div>

  )

}

export default Checkout