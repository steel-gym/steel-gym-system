import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";

function Scan() {

  const [message, setMessage] = useState("جارٍ التحقق...");
  const [needLogin, setNeedLogin] = useState(false);
  const [employeeCodeInput, setEmployeeCodeInput] = useState("");

  const [loading,setLoading] = useState(true);
  const [status,setStatus] = useState("normal");

  const hasRun = useRef(false);

  useEffect(() => {

    if (hasRun.current) return;
    hasRun.current = true;

    handleScan();

  }, []);

  const getFingerprint = () => {

    let deviceId = localStorage.getItem("device_id");

    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("device_id", deviceId);
    }

    const userAgent = navigator.userAgent;
    const screenSize = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return deviceId + "_" + userAgent + "_" + screenSize + "_" + timezone;

  };

  const handleScan = async () => {

    try {

      setLoading(true);

      const fingerprint = getFingerprint();

      const { data: knownEmployee } = await supabase
        .from("employees")
        .select("*")
        .eq("device_fingerprint", fingerprint)
        .maybeSingle();

      if (knownEmployee) {

        await registerAttendance(knownEmployee);
        return;

      }

      setNeedLogin(true);
      setLoading(false);

    } catch (error) {

      console.error(error);

      setStatus("error");
      setMessage("حدث خطأ أثناء التحقق");
      setLoading(false);

    }

  };

  const registerAttendance = async (employee) => {

    try {

      if (!navigator.geolocation) {

        setStatus("error");
        setMessage("المتصفح لا يدعم تحديد الموقع");
        setLoading(false);
        return;

      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      const gymLat = 30.865391;
      const gymLng = 31.460973;

      const getDistance = (lat1, lon1, lat2, lon2) => {

        const R = 6371;

        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;

        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;

      };

      const distance = getDistance(userLat, userLng, gymLat, gymLng);

      if (distance > 0.2) {

        setStatus("error");
        setMessage("يجب أن تكون داخل الجيم");
        setLoading(false);
        return;

      }

      const today = new Date().toISOString().split("T")[0];

      const { data: todayAttendance } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("work_date", today);

      if (todayAttendance && todayAttendance.length > 0) {

        setStatus("normal");
        setMessage("تم تسجيل حضورك اليوم بالفعل");
        setLoading(false);
        return;

      }

      await supabase.from("attendance").insert([
        {
          employee_id: employee.id,
          check_in: new Date().toISOString(),
          work_date: today
        }
      ]);

      setStatus("success");
      setMessage("تم تسجيل الحضور بنجاح");
      setLoading(false);

    } catch (error) {

      console.error(error);

      setStatus("error");
      setMessage("حدث خطأ أثناء التسجيل");
      setLoading(false);

    }

  };

  const firstLogin = async () => {

    try {

      setLoading(true);

      const fingerprint = getFingerprint();

      const { data: employee } = await supabase
        .from("employees")
        .select("*")
        .eq("employee_code", employeeCodeInput)
        .maybeSingle();

      if (!employee) {

        setStatus("error");
        setMessage("كود الموظف غير صحيح");
        setLoading(false);
        return;

      }

      if (employee.device_fingerprint) {

        setStatus("error");
        setMessage("هذا الموظف مسجل على جهاز آخر");
        setLoading(false);
        return;

      }

      const { data: deviceUsed } = await supabase
        .from("employees")
        .select("*")
        .eq("device_fingerprint", fingerprint)
        .maybeSingle();

      if (deviceUsed) {

        setStatus("error");
        setMessage("هذا الجهاز مسجل لموظف آخر");
        setLoading(false);
        return;

      }

      const { error } = await supabase
        .from("employees")
        .update({
          device_fingerprint: fingerprint
        })
        .eq("id", employee.id);

      if (error) {

        setStatus("error");
        setMessage("حدث خطأ أثناء تسجيل الجهاز");
        setLoading(false);
        return;

      }

      setStatus("success");
      setMessage("تم تسجيل الجهاز بنجاح");
      setLoading(false);

      setTimeout(()=>{

        registerAttendance(employee);

      },1500);

    } catch (error) {

      console.error(error);

      setStatus("error");
      setMessage("حدث خطأ أثناء تسجيل الجهاز");
      setLoading(false);

    }

  };

  if (needLogin) {

    return (

      <div
        style={{
          minHeight:"100vh",
          display:"flex",
          justifyContent:"center",
          alignItems:"center",
          flexDirection:"column",
          background:"#0f172a",
          color:"#fff"
        }}
      >

        <h2 style={{marginBottom:"15px"}}>
          أدخل كود الموظف
        </h2>

        <input
          value={employeeCodeInput}
          onChange={(e)=>setEmployeeCodeInput(e.target.value)}
          placeholder="كود الموظف"
          style={{
            width:"260px",
            padding:"12px",
            borderRadius:"10px",
            border:"1px solid #475569",
            fontSize:"18px",
            textAlign:"center",
            background:"#ffffff",
            color:"#000"
          }}
        />

        <button
          onClick={firstLogin}
          style={{
            marginTop:"20px",
            padding:"12px 30px",
            fontSize:"18px",
            borderRadius:"10px",
            border:"none",
            background:"#2563eb",
            color:"#fff",
            cursor:"pointer"
          }}
        >
          تسجيل الجهاز
        </button>

        {loading && (
          <div style={{marginTop:"20px",fontSize:"20px"}}>
            ⏳ جاري التسجيل...
          </div>
        )}

        {!loading && status === "success" && (
          <div style={{marginTop:"20px",color:"#22c55e",fontSize:"20px"}}>
            ✔ {message}
          </div>
        )}

        {!loading && status === "error" && (
          <div style={{marginTop:"20px",color:"#ef4444",fontSize:"20px"}}>
            ✖ {message}
          </div>
        )}

      </div>

    );

  }

  return (

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

  );

}

export default Scan;