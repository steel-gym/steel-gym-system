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
  const { id } = useParams();

  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: emp } = await supabase
      .from("employees")
      .select("*")
      .eq("id", id)
      .single();

    const today = new Date();
    const firstDayOfMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    ).toLocaleDateString("en-CA");

    const { data: att } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", id)
      .gte("work_date", firstDayOfMonth)
      .order("work_date", { ascending: true });

    setEmployee(emp);
    setAttendance(att || []);
  };

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

  if (!employee) return null;

  return (
    <div className="p-10 text-white min-h-screen bg-gradient-to-br from-gray-900 to-black">

      <h2 className="text-3xl font-bold mb-8">
        👤 {employee.full_name}
      </h2>

      <div className="bg-white/10 p-8 rounded-2xl shadow-xl">
        <Line data={lineData} />
      </div>

    </div>
  );
}

export default EmployeeDetails;