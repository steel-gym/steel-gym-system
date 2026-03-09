import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";

function Scan() {

  const [message, setMessage] = useState("جارٍ التحقق...");
  const [needLogin, setNeedLogin] = useState(false);
  const [employeeCodeInput, setEmployeeCodeInput] = useState("");

  const hasRun = useRef(false);

  useEffect(() => {

    if (hasRun.current) return;
    hasRun.current = true;

    handleScan();

  }, []);

  const handleScan = async () => {

    try {

      // 🔐 بصمة الجهاز
      let deviceId = localStorage.getItem("device_id");

      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("device_id", deviceId);
      }

      const userAgent = navigator.userAgent;
      const screenSize = `${window.screen.width}x${window.screen.height}`;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const fingerprint =
        deviceId + "_" + userAgent + "_" + screenSize + "_" + timezone;

      // 🔎 نبحث هل الجهاز معروف
      const { data: knownEmployee } = await supabase
        .from("employees")
        .select("*")
        .eq("device_fingerprint", fingerprint)
        .single();

      if (knownEmployee) {
        registerAttendance(knownEmployee);
        return;
      }

      // الجهاز جديد
      setNeedLogin(true);

    } catch (error) {

      console.error(error);
      setMessage("❌ حدث خطأ");

    }

  };

  const registerAttendance = async (employee) => {

    try {

      // 🔐 GPS
      if (!navigator.geolocation) {
        setMessage("❌ المتصفح لا يدعم تحديد الموقع");
        return;
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true }
        );
      });

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      const gymLat = 30.851914;
      const gymLng = 31.453270;

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
        setMessage("❌ يجب أن تكون داخل الجيم");
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      const { data: existing } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("work_date", today)
        .is("check_out", null);

      if (!existing || existing.length === 0) {

        await supabase.from("attendance").insert([
          {
            employee_id: employee.id,
            check_in: new Date().toISOString(),
            work_date: today,
          },
        ]);

        setMessage(`✅ تم تسجيل حضور ${employee.full_name}`);

      } else {

        const record = existing[0];
        const nowISO = new Date().toISOString();

        const diff =
          (new Date(nowISO) - new Date(record.check_in)) /
          (1000 * 60 * 60);

        await supabase
          .from("attendance")
          .update({
            check_out: nowISO,
            total_hours: Number(diff.toFixed(2)),
          })
          .eq("id", record.id);

        setMessage(`✅ تم تسجيل انصراف ${employee.full_name}`);

      }

    } catch (error) {

      console.error(error);
      setMessage("❌ حدث خطأ");

    }

  };

  const firstLogin = async () => {

    try {

      const { data: employee } = await supabase
        .from("employees")
        .select("*")
        .eq("employee_code", employeeCodeInput)
        .single();

      if (!employee) {
        alert("الموظف غير موجود");
        return;
      }

      const fingerprint = localStorage.getItem("device_id");

      await supabase
        .from("employees")
        .update({ device_fingerprint: fingerprint })
        .eq("id", employee.id);

      registerAttendance(employee);

    } catch (error) {

      console.error(error);

    }

  };

  if (needLogin) {

    return (

      <div style={{ textAlign:"center", marginTop:"100px" }}>

        <h2>أدخل كود الموظف</h2>

        <input
          value={employeeCodeInput}
          onChange={(e)=>setEmployeeCodeInput(e.target.value)}
          placeholder="كود الموظف"
        />

        <br/><br/>

        <button onClick={firstLogin}>
          تسجيل الجهاز
        </button>

      </div>

    );

  }

  return (

    <div
      style={{
        width:"100%",
        padding:"12px",
        borderRadius:"8px",
        border:"1px solid #334155",
        marginBottom:"15px",
        fontSize:"16px",
        background:"#2563eb"
        color:"#000000",
        outline:"none"
      }}
   />
      {message}
    </div>

  );

}

export default Scan;