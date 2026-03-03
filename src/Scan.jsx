import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";

function Scan() {
  const [message, setMessage] = useState("جارٍ التسجيل...");
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return; // يمنع التنفيذ مرتين
    hasRun.current = true;

    const handleScan = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const employeeCode = params.get("code");

        if (!employeeCode) {
          setMessage("رابط غير صالح");
          return;
        }

        // 1️⃣ نجيب بيانات الموظف
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

        // 2️⃣ نبحث عن حضور مفتوح (check_out = null)
        const { data: existing, error: existError } = await supabase
          .from("attendance")
          .select("*")
          .eq("employee_id", employee.id)
          .is("check_out", null);

        if (existError) {
          console.error("Attendance Select Error:", existError);
          setMessage("حدث خطأ أثناء قراءة بيانات الحضور");
          return;
        }

        // 3️⃣ لو مفيش حضور مفتوح → تسجيل حضور
        if (!existing || existing.length === 0) {
          const { error: insertError } = await supabase
            .from("attendance")
            .insert([
              {
                employee_id: employee.id,
                check_in: new Date().toISOString(),
                work_date: new Date().toISOString().split("T")[0],
              },
            ]);

          if (insertError) {
            console.error("Insert Error:", insertError);
            setMessage("حدث خطأ أثناء تسجيل الحضور");
            return;
          }

          setMessage(`✅ تم تسجيل حضور ${employee.full_name}`);
        } 
        // 4️⃣ لو فيه حضور مفتوح → تسجيل انصراف
        else {
          const record = existing[0];
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
        }
      } catch (error) {
        console.error("Unexpected Error:", error);
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