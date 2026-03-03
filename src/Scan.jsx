import { useEffect, useState } from "react";
import { supabase } from "./supabase";

function Scan() {
  const [message, setMessage] = useState("جارٍ التسجيل...");

  useEffect(() => {
    const handleScan = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const employeeCode = params.get("code");

        if (!employeeCode) {
          setMessage("رابط غير صالح");
          return;
        }

        // 1️⃣ نجيب الموظف
        const { data: employee, error: empError } = await supabase
          .from("employees")
          .select("*")
          .eq("employee_code", employeeCode)
          .single();

        if (empError || !employee) {
          console.error("Employee Error:", empError);
          setMessage("الموظف غير موجود");
          return;
        }

        const today = new Date().toLocaleDateString("en-CA");

        // 2️⃣ نشوف هل سجل قبل كده
        const { data: existing, error: existError } = await supabase
          .from("attendance")
          .select("*")
          .eq("employee_id", employee.id)
          .eq("work_date", today);

        if (existError) {
          console.error("Select Attendance Error:", existError);
          setMessage("خطأ في قراءة بيانات الحضور");
          return;
        }

        // 3️⃣ تسجيل حضور
        if (!existing || existing.length === 0) {
          const { error: insertError } = await supabase
            .from("attendance")
            .insert([
              {
                employee_id: employee.id,
                check_in: new Date().toISOString(),
                work_date: today,
              },
            ]);

          if (insertError) {
            console.error("Insert Error:", insertError);
            setMessage("حدث خطأ أثناء تسجيل الحضور");
            return;
          }

          setMessage(`✅ تم تسجيل حضور ${employee.full_name}`);
        } else {
          const record = existing[0];

          // 4️⃣ تسجيل انصراف
          if (!record.check_out) {
            const nowISO = new Date().toISOString();
            const diff =
              (new Date(nowISO) - new Date(record.check_in)) /
              (1000 * 60 * 60);

            const { error: updateError } = await supabase
              .from("attendance")
              .update({
                check_out: nowISO,
                total_hours: Number(diff.toFixed(2)),
              })
              .eq("id", record.id);

            if (updateError) {
              console.error("Update Error:", updateError);
              setMessage("حدث خطأ أثناء تسجيل الانصراف");
              return;
            }

            setMessage(`✅ تم تسجيل انصراف ${employee.full_name}`);
          } else {
            setMessage("تم تسجيل الحضور والانصراف اليوم بالفعل");
          }
        }
      } catch (err) {
        console.error("Unexpected Error:", err);
        setMessage("حدث خطأ غير متوقع");
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
        fontSize: "26px",
        fontWeight: "bold",
        textAlign: "center",
        backgroundColor: "#111",
        color: "#ffffff",
      }}
    >
      {message}
    </div>
  );
}

export default Scan;