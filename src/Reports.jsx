import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import { Users, UserCheck, UserX } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

function Reports() {
  const [activeTab, setActiveTab] = useState("overview");
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [todayView, setTodayView] = useState(null);

  const todayISO = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(todayISO);
  const [toDate, setToDate] = useState(todayISO);
  const [selectedEmployee, setSelectedEmployee] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: emp } = await supabase
      .from("employees")
      .select("*")
      .eq("is_active", true);

    const { data: att } = await supabase
      .from("attendance")
      .select("*");

    setEmployees(emp || []);
    setAttendance(att || []);
  };

  const today = new Date();
  const todayStr = today.toLocaleDateString("en-CA");

  const firstDayOfMonthDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  const todayAttendance = attendance.filter(
    (a) => a.work_date === todayStr
  );

  const presentNow = todayAttendance.filter(
    (a) => !a.check_out
  );

  const attendedToday = employees.filter((e) =>
    todayAttendance.some(
      (a) => String(a.employee_id) === String(e.id)
    )
  );

  const absentToday = employees.filter(
    (e) =>
      !todayAttendance.some(
        (a) => String(a.employee_id) === String(e.id)
      )
  );

  // =========================
  // الحساب الشهري
  // =========================

  let totalWorkedDaysAllEmployees = 0;
  let totalPresentAllEmployees = 0;

  const monthlyStats = employees.map((emp) => {
    const joinDate = new Date(emp.created_at);

    const startDate =
      joinDate > firstDayOfMonthDate
        ? joinDate
        : firstDayOfMonthDate;

    if (startDate > today) {
      return {
        name: emp.full_name,
        present: 0,
        absent: 0,
        workedDays: 0,
      };
    }

    const diffTime = today - startDate;
    const workedDays =
      Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const empAttendance = attendance.filter(
      (a) => {
        const workDate = new Date(a.work_date);
        return (
          String(a.employee_id) === String(emp.id) &&
          workDate >= startDate &&
          workDate <= today
        );
      }
    );

    const presentDays = empAttendance.length;
    const safeWorkedDays =
      workedDays > 0 ? workedDays : 1;

    const absentDays =
      safeWorkedDays - presentDays > 0
        ? safeWorkedDays - presentDays
        : 0;

    totalWorkedDaysAllEmployees += safeWorkedDays;
    totalPresentAllEmployees += presentDays;

    return {
      name: emp.full_name,
      present: presentDays,
      absent: absentDays,
      workedDays: safeWorkedDays,
    };
  });

  const attendanceRate =
    totalWorkedDaysAllEmployees > 0
      ? (
          (totalPresentAllEmployees /
            totalWorkedDaysAllEmployees) *
          100
        ).toFixed(1)
      : 0;

  const topEmployee =
    [...monthlyStats].sort(
      (a, b) => b.present - a.present
    )[0];

  // =========================
  // التقرير المخصص
  // =========================

  const diffDays = (start, end) => {
    const diff =
      new Date(end) - new Date(start);
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const filteredEmployees =
    selectedEmployee === "all"
      ? employees
      : employees.filter(
          (e) =>
            String(e.id) === String(selectedEmployee)
        );

  const customStats = filteredEmployees.map((emp) => {
    const joinDate = new Date(emp.created_at);

    const rangeStart =
      joinDate > new Date(fromDate)
        ? joinDate
        : new Date(fromDate);

    if (rangeStart > new Date(toDate)) {
      return {
        name: emp.full_name,
        present: 0,
        absent: 0,
        rate: 0,
      };
    }

    const totalDays = diffDays(rangeStart, toDate);

    const empAttendance = attendance.filter((a) => {
      const workDate = new Date(a.work_date);
      return (
        String(a.employee_id) === String(emp.id) &&
        workDate >= rangeStart &&
        workDate <= new Date(toDate)
      );
    });

    const present = empAttendance.length;
    const absent =
      totalDays - present > 0
        ? totalDays - present
        : 0;

    const rate =
      totalDays > 0
        ? ((present / totalDays) * 100).toFixed(1)
        : 0;

    return {
      name: emp.full_name,
      present,
      absent,
      rate,
    };
  });

  const menu = [
    { id: "overview", label: "📊 نظرة عامة" },
    { id: "today", label: "👥 حضور اليوم" },
    { id: "monthly", label: "📅 التقرير الشهري" },
    { id: "custom", label: "🗓 تقرير مخصص" },
    { id: "salary", label: "💰 الرواتب" },
    { id: "top", label: "🏆 أفضل موظف" },
  ];

  const renderContent = () => {
    switch (activeTab) {

      case "today":
        return (
          <>
            <h2 className="text-2xl mb-8 font-bold">
              حضور اليوم
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

              <StatCard
                title="الموجودين الآن"
                value={presentNow.length}
                color="green"
                icon={<Users size={28} />}
                onClick={() => setTodayView("now")}
              />

              <StatCard
                title="حضروا اليوم"
                value={attendedToday.length}
                color="blue"
                icon={<UserCheck size={28} />}
                onClick={() => setTodayView("attended")}
              />

              <StatCard
                title="غايبين اليوم"
                value={absentToday.length}
                color="red"
                icon={<UserX size={28} />}
                onClick={() => setTodayView("absent")}
              />

            </div>

            {todayView && (
              <TodayTable
                type={todayView}
                presentNow={presentNow}
                attendedToday={attendedToday}
                absentToday={absentToday}
                employees={employees}
              />
            )}
          </>
        );

      case "overview":
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
              <Card title="عدد الموظفين" value={employees.length} />
              <Card title="الموجودين الآن" value={presentNow.length} />
              <Card title="غياب اليوم" value={absentToday.length} />
              <Card title="نسبة الحضور %" value={attendanceRate} />
            </div>

            <Pie
              data={{
                labels: ["حضور", "غياب"],
                datasets: [
                  {
                    data: [
                      totalPresentAllEmployees,
                      totalWorkedDaysAllEmployees -
                        totalPresentAllEmployees,
                    ],
                    backgroundColor: [
                      "#22c55e",
                      "#ef4444",
                    ],
                  },
                ],
              }}
            />
          </>
        );

      case "monthly":
        return (
          <Bar
            data={{
              labels: monthlyStats.map((e) => e.name),
              datasets: [
                {
                  label: "الحضور",
                  data: monthlyStats.map((e) => e.present),
                  backgroundColor: "#22c55e",
                },
                {
                  label: "الغياب",
                  data: monthlyStats.map((e) => e.absent),
                  backgroundColor: "#ef4444",
                },
              ],
            }}
          />
        );

      case "custom":
  return (
    <>
      <h2 className="text-2xl mb-6 font-bold">
        تقرير بفترة مخصصة
      </h2>

      {/* الفلاتر */}
      <div className="bg-white/10 p-6 rounded-2xl mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">

        <div>
          <label className="block mb-2">من تاريخ</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full p-2 rounded bg-black/40"
          />
        </div>

        <div>
          <label className="block mb-2">إلى تاريخ</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full p-2 rounded bg-black/40"
          />
        </div>

        <div>
          <label className="block mb-2">اختر موظف</label>
          <select
            value={selectedEmployee}
            onChange={(e) =>
              setSelectedEmployee(e.target.value)
            }
            className="w-full p-2 rounded bg-black/40"
          >
            <option value="all">
              كل الموظفين
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
        </div>

      </div>

      {/* جدول النتائج */}
      <div className="bg-white/10 p-6 rounded-2xl mb-8">
        <h3 className="text-xl mb-4 font-bold">
          النتائج
        </h3>

        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-white/20">
              <th className="pb-2">الموظف</th>
              <th className="pb-2">أيام الحضور</th>
              <th className="pb-2">أيام الغياب</th>
              <th className="pb-2">نسبة الحضور %</th>
            </tr>
          </thead>
          <tbody>
            {customStats.map((emp, index) => (
              <tr key={index} className="border-b border-white/10">
                <td className="py-2">{emp.name}</td>
                <td>{emp.present}</td>
                <td>{emp.absent}</td>
                <td>{emp.rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        {customStats.length === 0 && (
          <p className="mt-4">لا يوجد بيانات</p>
        )}
      </div>

      {/* الرسم البياني */}
      <Bar
        data={{
          labels: customStats.map((e) => e.name),
          datasets: [
            {
              label: "الحضور",
              data: customStats.map((e) => e.present),
              backgroundColor: "#22c55e",
            },
            {
              label: "الغياب",
              data: customStats.map((e) => e.absent),
              backgroundColor: "#ef4444",
            },
          ],
        }}
      />
    </>
  );

      case "salary":
        const totalSalaries = employees.reduce(
          (sum, emp) => {
            const empStat = monthlyStats.find(
              (e) => e.name === emp.full_name
            );
            const daily =
              emp.base_salary /
              (empStat?.workedDays || 1);
            return (
              sum +
              daily * (empStat?.present || 0)
            );
          },
          0
        );

        return (
          <Card
            title="إجمالي الرواتب المستحقة"
            value={totalSalaries.toFixed(2) + " جنيه"}
          />
        );

      case "top":
        return (
          <Card
            title="أفضل موظف هذا الشهر"
            value={
              topEmployee
                ? `${topEmployee.name} (${topEmployee.present} يوم)`
                : "لا يوجد بيانات"
            }
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen text-white">
      <div className="w-64 bg-black/40 backdrop-blur-xl p-6 border-r border-white/10">
        <h2 className="text-xl font-bold mb-8">📊 التقارير</h2>
        {menu.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`block w-full text-right px-4 py-3 rounded-lg mb-2 transition ${
              activeTab === item.id
                ? "bg-blue-600"
                : "hover:bg-white/10"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-10 bg-gradient-to-br from-gray-900 to-black">
        {renderContent()}
      </div>
    </div>
  );
}

const Card = ({ title, value }) => (
  <div className="bg-white/10 p-6 rounded-2xl text-center shadow-xl">
    <h3 className="text-gray-300 mb-3">{title}</h3>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

const StatCard = ({ title, value, color, icon, onClick }) => (
  <div
    onClick={onClick}
    className={`cursor-pointer p-6 rounded-2xl shadow-xl transition hover:scale-105 bg-${color}-600/20 hover:bg-${color}-600/40`}
  >
    <div className="flex justify-between items-center mb-4">
      {icon}
      <span className="text-3xl font-bold">{value}</span>
    </div>
    <h3 className="text-lg">{title}</h3>
  </div>
);

const TodayTable = ({
  type,
  presentNow,
  attendedToday,
  absentToday,
  employees,
}) => {
  let data = [];
  let title = "";

  if (type === "now") {
    data = presentNow;
    title = "الموجودين الآن";
  }
  if (type === "attended") {
    data = attendedToday;
    title = "حضروا اليوم";
  }
  if (type === "absent") {
    data = absentToday;
    title = "غايبين اليوم";
  }

  return (
    <div className="bg-white/10 p-6 rounded-2xl mt-6">
      <h3 className="text-xl mb-4 font-bold">{title}</h3>
      <ul>
        {data.length === 0 && <li>لا يوجد بيانات</li>}
        {data.map((item, i) => {
          const emp =
            item.full_name
              ? item
              : employees.find(
                  (e) =>
                    String(e.id) ===
                    String(item.employee_id)
                );
          return <li key={i}>{emp?.full_name}</li>;
        })}
      </ul>
    </div>
  );
};

export default Reports;