import { useEffect, useState } from "react";
import { supabase } from "./supabase";

function Reports() {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState("");
  const [period, setPeriod] = useState("today");
  const [report, setReport] = useState([]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, full_name");

    setEmployees(data || []);
  };

  const loadReport = async () => {
    if (!selected) return;

    let fromDate = new Date();

    if (period === "week") {
      fromDate.setDate(fromDate.getDate() - 7);
    } else if (period === "month") {
      fromDate.setMonth(fromDate.getMonth() - 1);
    }

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", selected)
      .gte("work_date", fromDate.toLocaleDateString("en-CA"));

    setReport(data || []);
  };

  const totalHours = report.reduce(
    (sum, r) => sum + (r.total_hours || 0),
    0
  );

  return (
    <div className="p-10 text-white">
      <h2 className="text-2xl mb-6">تقارير الموظفين</h2>

      <div className="flex gap-4 mb-6">
        <select
          onChange={(e) => setSelected(e.target.value)}
          className="p-3 text-black rounded-lg"
        >
          <option value="">اختر موظف</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.full_name}
            </option>
          ))}
        </select>

        <select
          onChange={(e) => setPeriod(e.target.value)}
          className="p-3 text-black rounded-lg"
        >
          <option value="today">اليوم</option>
          <option value="week">آخر 7 أيام</option>
          <option value="month">آخر شهر</option>
        </select>

        <button
          onClick={loadReport}
          className="bg-blue-600 px-5 py-2 rounded-lg"
        >
          عرض
        </button>
      </div>

      <div className="bg-white/10 p-6 rounded-xl">
        <p>عدد أيام الحضور: {report.length}</p>
        <p>إجمالي الساعات: {totalHours.toFixed(2)}</p>
      </div>
    </div>
  );
}

export default Reports;