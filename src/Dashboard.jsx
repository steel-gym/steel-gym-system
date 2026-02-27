import { useEffect, useState } from "react";
import { supabase } from "./supabase";

function Dashboard() {
  const [employeesCount, setEmployeesCount] = useState(0);
  const [presentNow, setPresentNow] = useState(0);
  const [todayHours, setTodayHours] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { count: empCount } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true });

    const { count: openCount } = await supabase
      .from("attendance")
      .select("*", { count: "exact", head: true })
      .is("check_out", null);

    const today = new Date().toISOString().split("T")[0];

    const { data } = await supabase
      .from("attendance")
      .select("total_hours")
      .gte("check_in", today + "T00:00:00");

    const hours =
      data?.reduce((sum, r) => sum + (r.total_hours || 0), 0) || 0;

    setEmployeesCount(empCount || 0);
    setPresentNow(openCount || 0);
    setTodayHours(hours);
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h2>Dashboard</h2>
      <p>عدد الموظفين: {employeesCount}</p>
      <p>الموجودين حالياً: {presentNow}</p>
      <p>إجمالي ساعات اليوم: {todayHours.toFixed(2)}</p>
    </div>
  );
}

export default Dashboard;