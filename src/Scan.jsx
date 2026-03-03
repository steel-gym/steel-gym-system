import { useEffect, useState } from "react";
import { supabase } from "./supabase";

function Scan() {
  const [message, setMessage] = useState("جارٍ التسجيل...");

  useEffect(() => {
    const handleScan = async () => {
      const params = new URLSearchParams(window.location.search);
      const employeeCode = params.get("code");

      if (!employeeCode) {
        setMessage("رابط غير صالح");
        return;
      }

      // نجيب الموظف عن طريق employee_code
      const { data: employee } = await supabase
        .from("employees")
        .select("*")
        .eq("employee_code", employeeCode)
        .single();

      if (!employee) {
        setMessage("الموظف غير موجود");
        return;
      }

      const today = new Date().toLocaleDateString("en-CA");

      const { data: existing } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("work_date", today);

      if (!existing || existing.length === 0) {
        // تسجيل حضور
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

        if (!record.check_out) {
          const nowISO = new Date().toISOString();
          const diff =
            (new Date(nowISO) - new Date(record.check_in)) /
            (1000 * 60 * 60);

          await supabase
            .from("attendance")
            .update({
              check_out: nowISO,
              total_hours: diff.toFixed(2),
            })
            .eq("id", record.id);

          setMessage(`✅ تم تسجيل انصراف ${employee.full_name}`);
        } else {
          setMessage("تم تسجيل الحضور والانصراف اليوم بالفعل");
        }
      }
    };

    handleScan();
  }, []);

  return (
  <div style={{
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "26px",
    fontWeight: "bold",
    textAlign: "center",
    backgroundColor: "#111",
    color: "#ffffff"
  }}>
    {message}
  </div>
);
}

export default Scan;