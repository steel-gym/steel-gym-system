import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";

function Scan() {
  const [message, setMessage] = useState("جارٍ التحقق...");
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const handleScan = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        let employeeCode = params.get("code");
        const ts = params.get("ts");

        if (!employeeCode || !ts) {
          setMessage("رابط غير صالح");
          return;
        }

        employeeCode = Number(employeeCode.trim());
        if (!employeeCode) {
          setMessage("رابط غير صالح");
          return;
        }

        // 🔐 1️⃣ تحقق من صلاحية الكود (60 ثانية)
        const now = Date.now();
        const diffTime = Math.abs(now - Number(ts));

        if (diffTime > 60000) {
          setMessage("❌ الكود منتهي الصلاحية");
          return;
        }

        // 🔐 2️⃣ تحقق من الموقع
        if (!navigator.geolocation) {
          setMessage("❌ المتصفح لا يدعم تحديد الموقع");
          return;
        }

        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            }
          );
        });

        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        const gymLat = 30.884788;
        const gymLng = 31.457687;

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

        // 🔐 3️⃣ إنشاء بصمة جهاز قوية
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

        // 🔎 4️⃣ جلب الموظف
        const { data: employee, error: empError } = await supabase
          .from("employees")
          .select("*")
          .eq("employee_code", employeeCode)
          .single();

        if (empError || !employee) {
          setMessage("الموظف غير موجود");
          return;
        }

        // 🔐 5️⃣ تحقق من الجهاز
        if (employee.device_fingerprint) {
          if (employee.device_fingerprint !== fingerprint) {
            setMessage("❌ هذا الجهاز غير مسموح به");
            return;
          }
        } else {
          const { error: updateError } = await supabase
            .from("employees")
            .update({ device_fingerprint: fingerprint })
            .eq("id", employee.id);

          if (updateError) {
            console.error(updateError);
            setMessage("❌ فشل تسجيل الجهاز لأول مرة");
            return;
          }
        }

        // 🔎 6️⃣ تحقق من حضور اليوم
        const today = new Date().toISOString().split("T")[0];

        const { data: existing } = await supabase
          .from("attendance")
          .select("*")
          .eq("employee_id", employee.id)
          .eq("work_date", today)
          .is("check_out", null);

        // ✅ تسجيل حضور
        if (!existing || existing.length === 0) {
          await supabase.from("attendance").insert([
            {
              employee_id: employee.id,
              check_in: new Date().toISOString(),
              work_date: today,
            },
          ]);

          setMessage(`✅ تم تسجيل حضور ${employee.full_name}`);
        } 
        // ✅ تسجيل انصراف
        else {
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
        console.error("SCAN ERROR:", error);
        setMessage("❌ حدث خطأ في التحقق");
      }
    };

    handleScan();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "24px",
        fontWeight: "bold",
        textAlign: "center",
        backgroundColor: "#111",
        color: "#fff",
      }}
    >
      {message}
    </div>
  );
}

export default Scan;