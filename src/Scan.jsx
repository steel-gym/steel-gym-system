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

        // 🔐 1️⃣ تحقق من صلاحية الوقت (60 ثانية)
        const now = Date.now();
        const diffTime = Math.abs(now - Number(ts));

        if (diffTime > 60000) {
          setMessage("❌ الكود منتهي الصلاحية");
          return;
        }

        // 🔐 2️⃣ تحقق من الموقع (إجبار طلب الموقع)
        if (!navigator.geolocation) {
          setMessage("❌ المتصفح لا يدعم تحديد الموقع");
          return;
        }

        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            (error) => {
              reject(error);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            }
          );
        });

        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        const gymLat = 30.851852;   // 👈 إحداثيات الجيم
        const gymLng = 31.453222;   // 👈 إحداثيات الجيم

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

        // 🔐 3️⃣ بصمة الجهاز
        const fingerprint =
          navigator.userAgent +
          screen.width +
          screen.height +
          Intl.DateTimeFormat().resolvedOptions().timeZone;

        // 🔎 4️⃣ نجيب الموظف
        const { data: employee, error: empError } = await supabase
          .from("employees")
          .select("*")
          .eq("employee_code", employeeCode)
          .single();

        if (empError || !employee) {
          setMessage("الموظف غير موجود");
          return;
        }

       // 🔐 تحقق من الجهاز
if (employee.device_fingerprint) {
  if (employee.device_fingerprint !== fingerprint) {
    setMessage("❌ هذا الجهاز غير مسموح به");
    return;
  }
} else {
  // أول مرة → نحفظ بصمة الجهاز
  const { error: updateError } = await supabase
    .from("employees")
    .update({ device_fingerprint: fingerprint })
    .eq("id", employee.id);

  if (updateError) {
    console.error(updateError);
    setMessage("❌ حدث خطأ أثناء حفظ الجهاز");
    return;
  }
}

        // 🔎 6️⃣ تحقق حضور مفتوح
        const { data: existing } = await supabase
          .from("attendance")
          .select("*")
          .eq("employee_id", employee.id)
          .is("check_out", null);

        if (!existing || existing.length === 0) {
          await supabase.from("attendance").insert([
            {
              employee_id: employee.id,
              check_in: new Date().toISOString(),
              work_date: new Date().toISOString().split("T")[0],
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