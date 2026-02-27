import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import Employees from "./Employees";
import Reports from "./Reports";
import CountUp from "react-countup";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function App() {
  const [loggedIn, setLoggedIn] = useState(
    localStorage.getItem("admin") === "true"
  );

  const [dark, setDark] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentNow: 0,
    totalHoursToday: 0,
    attendedToday: 0,
    absentToday: 0,
  });

  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (loggedIn) {
      loadEmployees();
      loadStats();
    }
  }, [loggedIn]);

  if (!loggedIn) {
    return <Login setLoggedIn={setLoggedIn} />;
  }

  const getToday = () => {
    return new Date().toLocaleDateString("en-CA");
  };

  const loadEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, full_name");

    setEmployees(data || []);
  };

  const handleCheckIn = async () => {
    if (!selectedEmployee) return alert("اختر موظف");

    const today = getToday();

    const { error } = await supabase.from("attendance").insert([
      {
        employee_id: selectedEmployee,
        check_in: new Date().toISOString(),
        work_date: today,
      },
    ]);

    if (error) {
      if (error.code === "23505") {
        alert("تم تسجيل حضور لهذا الموظف اليوم بالفعل");
      } else {
        alert("خطأ أثناء تسجيل الحضور");
      }
      return;
    }

    loadStats();
    alert("تم تسجيل الحضور بنجاح");
  };

  const handleCheckOut = async () => {
    if (!selectedEmployee) return alert("اختر موظف");

    const today = getToday();

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", selectedEmployee)
      .eq("work_date", today);

    if (!data || data.length === 0) {
      alert("لم يسجل حضور اليوم");
      return;
    }

    const record = data[0];

    if (record.check_out) {
      alert("تم تسجيل الانصراف بالفعل اليوم");
      return;
    }

    const now = new Date().toISOString();
    const diff =
      (new Date(now) - new Date(record.check_in)) /
      (1000 * 60 * 60);

    await supabase
      .from("attendance")
      .update({
        check_out: now,
        total_hours: diff.toFixed(2),
      })
      .eq("id", record.id);

    loadStats();
    alert("تم تسجيل الانصراف بنجاح");
  };

  const loadStats = async () => {
    const today = getToday();

    const { data: employees } = await supabase
      .from("employees")
      .select("id");

    const { data: todayAttendance } = await supabase
      .from("attendance")
      .select("*")
      .eq("work_date", today);

    const totalEmployees = employees?.length || 0;
    const attendedToday = todayAttendance?.length || 0;

    const presentNow =
      todayAttendance?.filter((r) => r.check_out === null).length || 0;

    const totalHoursToday =
      todayAttendance?.reduce(
        (sum, r) => sum + (r.total_hours || 0),
        0
      ) || 0;

    const absentToday = totalEmployees - attendedToday;

    setStats({
      totalEmployees,
      presentNow,
      totalHoursToday,
      attendedToday,
      absentToday,
    });

    const grouped = {};
    todayAttendance?.forEach((r) => {
      const hour = new Date(r.check_in).getHours();
      grouped[hour] = (grouped[hour] || 0) + (r.total_hours || 0);
    });

    setChartData({
      labels: Object.keys(grouped),
      datasets: [
        {
          label: "ساعات العمل",
          data: Object.values(grouped),
          backgroundColor: "#3b82f6",
        },
      ],
    });
  };

  const logout = () => {
    localStorage.removeItem("admin");
    setLoggedIn(false);
  };

  const Dashboard = () => (
    <>
      <div className="px-10">
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="p-3 rounded-lg border"
        >
          <option value="">اختر موظف</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.full_name}
            </option>
          ))}
        </select>

        <div className="mt-4 flex gap-4">
          <button
            onClick={handleCheckIn}
            className="bg-green-600 text-white px-6 py-2 rounded-lg"
          >
            تسجيل حضور
          </button>

          <button
            onClick={handleCheckOut}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            تسجيل انصراف
          </button>
        </div>
      </div>

      <div className="px-10 mt-10 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-8">
        <StatCard title="عدد الموظفين" value={stats.totalEmployees} />
        <StatCard title="الموجودين الآن" value={stats.presentNow} />
        <StatCard title="إجمالي ساعات اليوم" value={stats.totalHoursToday} />
        <StatCard title="حضروا اليوم" value={stats.attendedToday} />
        <StatCard title="غايبين اليوم" value={stats.absentToday} />
      </div>

      <div className="px-10 mt-16">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl shadow-2xl">
          <h2 className="text-xl text-white mb-6">تحليل ساعات اليوم</h2>
          {chartData && <Bar data={chartData} />}
        </div>
      </div>
    </>
  );

  return (
    <BrowserRouter>
      <div className={dark ? "dark" : ""}>
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-950 dark:to-black transition-all duration-500">

          <div className="flex justify-between items-center px-10 py-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              🏋️ Steel Gym System
            </h1>

            <div className="flex gap-6 items-center">
              <Link to="/" className="text-white">الرئيسية</Link>
              <Link to="/employees" className="text-white">الموظفين</Link>
              <Link to="/reports" className="text-white">التقارير</Link>

              <button
                onClick={() => setDark(!dark)}
                className="bg-black dark:bg-white dark:text-black text-white px-4 py-2 rounded-lg"
              >
                {dark ? "☀ Light" : "🌙 Dark"}
              </button>

              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                خروج
              </button>
            </div>
          </div>

          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>

        </div>
      </div>
    </BrowserRouter>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl shadow-2xl 
    hover:scale-105 transition-all duration-500 text-white">
      <h3 className="text-gray-300 text-sm">{title}</h3>
      <p className="text-3xl font-bold mt-3">
        <CountUp end={value} duration={1.5} />
      </p>
    </div>
  );
}

export default App;