import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import Employees from "./Employees";
import Reports from "./Reports";
import CountUp from "react-countup";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";

function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

function App() {
  const navigate = useNavigate();

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
    absentToday: 0,
    todayAttendance: 0,
    attendanceRate: 0,
  });

  useEffect(() => {
    if (loggedIn) {
      loadEmployees();
      loadStats();
    }
  }, [loggedIn]);

  if (!loggedIn) return <Login setLoggedIn={setLoggedIn} />;

  const getToday = () =>
    new Date().toLocaleDateString("en-CA");

  const loadEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, full_name")
      .eq("is_active", true);

    setEmployees(data || []);
  };

  const handleCheckIn = async () => {
    if (!selectedEmployee)
      return alert("اختر موظف أولاً");

    const today = getToday();

    const { error } = await supabase
      .from("attendance")
      .insert([
        {
          employee_id: selectedEmployee,
          check_in: new Date().toISOString(),
          work_date: today,
        },
      ]);

    if (error)
      return alert("تم تسجيل حضور اليوم بالفعل");

    loadStats();
    alert("تم تسجيل الحضور");
  };

  const handleCheckOut = async () => {
    if (!selectedEmployee)
      return alert("اختر موظف أولاً");

    const today = getToday();

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", selectedEmployee)
      .eq("work_date", today);

    if (!data || data.length === 0)
      return alert("لم يسجل حضور اليوم");

    const record = data[0];

    if (record.check_out)
      return alert("تم تسجيل الانصراف بالفعل");

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

    loadStats();
    alert("تم تسجيل الانصراف");
  };

  const loadStats = async () => {
    const today = getToday();

    const { data: employeesData } = await supabase
      .from("employees")
      .select("*")
      .eq("is_active", true);

    const { data: todayAttendance } = await supabase
      .from("attendance")
      .select("*")
      .eq("work_date", today);

    const totalEmployees = employeesData?.length || 0;

    const presentNow =
      todayAttendance?.filter((r) => !r.check_out)
        .length || 0;

    const totalHoursToday =
      todayAttendance?.reduce(
        (sum, r) =>
          sum + Number(r.total_hours || 0),
        0
      ) || 0;

    const todayAttendanceCount =
      todayAttendance?.length || 0;

    const absentToday =
      totalEmployees - todayAttendanceCount;

    const attendanceRate =
      totalEmployees > 0
        ? (
            (todayAttendanceCount /
              totalEmployees) *
            100
          ).toFixed(1)
        : 0;

    setStats({
      totalEmployees,
      presentNow,
      totalHoursToday,
      absentToday,
      todayAttendance: todayAttendanceCount,
      attendanceRate,
    });
  };

  const logout = () => {
    localStorage.removeItem("admin");
    setLoggedIn(false);
  };

  const StatCard = ({ title, value, filter }) => (
    <div
      onClick={() =>
        navigate(`/reports?filter=${filter}`)
      }
      className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl shadow-2xl text-white text-center cursor-pointer hover:scale-105 hover:bg-white/20 transition"
    >
      <h3 className="text-gray-300 text-sm">
        {title}
      </h3>
      <p className="text-3xl font-bold mt-3">
        <CountUp
          end={Number(value)}
          duration={1.5}
        />
      </p>
    </div>
  );

  const Dashboard = () => (
    <>
      <div className="px-10 mt-8 bg-white/10 p-6 rounded-2xl shadow-xl backdrop-blur-xl">
        <h2 className="text-xl mb-4 text-white">
          تسجيل الحضور والانصراف
        </h2>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <select
            value={selectedEmployee}
            onChange={(e) =>
              setSelectedEmployee(e.target.value)
            }
            className="p-3 rounded-lg text-black w-64"
          >
            <option value="">
              اختر موظف
            </option>
            {employees.map((emp) => (
              <option
                key={emp.id}
                value={emp.id}
              >
                {emp.full_name}
              </option>
            ))}
          </select>

          <button
            onClick={handleCheckIn}
            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg text-white"
          >
            تسجيل حضور
          </button>

          <button
            onClick={handleCheckOut}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg text-white"
          >
            تسجيل انصراف
          </button>
        </div>
      </div>

      <div className="px-10 mt-10 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-8">
        <StatCard title="عدد الموظفين" value={stats.totalEmployees} filter="employees" />
        <StatCard title="الموجودين الآن" value={stats.presentNow} filter="presentNow" />
        <StatCard title="إجمالي ساعات اليوم" value={stats.totalHoursToday} filter="todayHours" />
        <StatCard title="غياب اليوم" value={stats.absentToday} filter="absentToday" />
        <StatCard title="حضور اليوم" value={stats.todayAttendance} filter="todayAttendance" />
        <StatCard title="نسبة الحضور %" value={stats.attendanceRate} filter="attendanceRate" />
      </div>
    </>
  );

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-950 dark:to-black">
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
  );
}

export default AppWrapper;