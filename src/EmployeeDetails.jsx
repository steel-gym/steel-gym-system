import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "./supabase";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

function EmployeeDetails() {
  const { id } = useParams(); // UUID string

  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const [todayHours, setTodayHours] = useState(0);
  const [weekHours, setWeekHours] = useState(0);
  const [monthHours, setMonthHours] = useState(0);
  const [monthDaysCount, setMonthDaysCount] = useState(0);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);

      // ✅ نجيب الموظف بالـ UUID
      const { data: emp, error: empError } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id)
        .single();

      if (empError || !emp) {
        console.error("Employee error:", empError);
        setLoading(false);
        return;
      }

      setEmployee(emp);

      const today = new Date();
      const firstDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString().split("T")[0];

      // ✅ نجيب حضور الشهر
      const { data: att, error: attError } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", id)
        .gte("work_date", firstDayOfMonth)
        .order("work_date", { ascending: true });

      if (attError) {
        console.error("Attendance error:", attError);
      }

      const records = att || [];
      setAttendance(records);

      calculateStats(records);

      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const calculateStats = (records) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const dayOfWeek = today.getDay();
    const diffToSaturday = (dayOfWeek + 1) % 7;

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - diffToSaturday);
    startOfWeek.setHours(0, 0, 0, 0);

    const todayTotal = records
      .filter((r) => r.work_date === todayStr)
      .reduce((sum, r) => sum + Number(r.total_hours || 0), 0);

    const weekTotal = records
      .filter((r) => {
        const workDate = new Date(r.work_date);
        return workDate >= startOfWeek && workDate <= today;
      })
      .reduce((sum, r) => sum + Number(r.total_hours || 0), 0);

    const monthTotal = records.reduce(
      (sum, r) => sum + Number(r.total_hours || 0),
      0
    );

    const uniqueDays = new Set(
      records.map((r) => r.work_date)
    );

    setTodayHours(todayTotal);
    setWeekHours(weekTotal);
    setMonthHours(monthTotal);
    setMonthDaysCount(uniqueDays.size);
  };

  if (loading) {
    return (
      <div className="p-10 text-white min-h-screen bg-gradient-to-br from-gray-900 to-black">
        جاري تحميل البيانات...
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-10 text-white min-h-screen bg-gradient-to-br from-gray-900 to-black">
        لم يتم العثور على الموظف
      </div>
    );
  }

  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();

  const monthDays = Array.from(
    { length: daysInMonth },
    (_, i) => i + 1
  );

  const attendanceMap = {};
  attendance.forEach((a) => {
    const day = new Date(a.work_date).getDate();
    attendanceMap[day] = 1;
  });

  const lineData = {
    labels: monthDays,
    datasets: [
      {
        label: "الحضور خلال الشهر",
        data: monthDays.map((d) =>
          attendanceMap[d] ? 1 : 0
        ),
        borderColor: "#22c55e",
        backgroundColor: "#22c55e",
        tension: 0.4,
      },
    ],
  };

  return (
    <div className="p-10 text-white min-h-screen bg-gradient-to-br from-gray-900 to-black">

      <h2 className="text-3xl font-bold mb-8">
        {employee.full_name}
      </h2>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/10 p-6 rounded-2xl">
          <h3 className="text-sm text-gray-300">ساعات اليوم</h3>
          <p className="text-2xl font-bold mt-2">
            {todayHours.toFixed(2)} س
          </p>
        </div>

        <div className="bg-white/10 p-6 rounded-2xl">
          <h3 className="text-sm text-gray-300">ساعات الأسبوع</h3>
          <p className="text-2xl font-bold mt-2">
            {weekHours.toFixed(2)} س
          </p>
        </div>

        <div className="bg-white/10 p-6 rounded-2xl">
          <h3 className="text-sm text-gray-300">ساعات الشهر</h3>
          <p className="text-2xl font-bold mt-2">
            {monthHours.toFixed(2)} س
          </p>
        </div>

        <div className="bg-white/10 p-6 rounded-2xl">
          <h3 className="text-sm text-gray-300">أيام الحضور</h3>
          <p className="text-2xl font-bold mt-2">
            {monthDaysCount} يوم
          </p>
        </div>
      </div>

      <div className="bg-white/10 p-8 rounded-2xl shadow-xl">
        <Line data={lineData} />
      </div>

    </div>
  );
}

export default EmployeeDetails;