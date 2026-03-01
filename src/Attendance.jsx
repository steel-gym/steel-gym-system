import { useEffect, useState } from "react";
import { supabase } from "./supabase";

function Attendance() {
  const [employees, setEmployees] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);

  const today = new Date();
  const todayStr = today.toLocaleDateString("en-CA"); // ✅ تاريخ محلي صحيح

  useEffect(() => {
    loadEmployees();
    loadTodayAttendance();
  }, []);

  const loadEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("is_active", true);

    setEmployees(data || []);
  };

  const loadTodayAttendance = async () => {
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("work_date", todayStr);

    setTodayAttendance(data || []);
  };

  const handleCheckIn = async (employeeId) => {
    const alreadyChecked = todayAttendance.find(
      (a) => a.employee_id === employeeId
    );

    if (alreadyChecked) {
      alert("تم تسجيل الحضور بالفعل اليوم");
      return;
    }

    await supabase.from("attendance").insert([
      {
        employee_id: employeeId,
        work_date: todayStr, // ✅ التاريخ الصحيح
        check_in: new Date(), // التوقيت الحالي
      },
    ]);

    loadTodayAttendance();
  };

  const handleCheckOut = async (employeeId) => {
    const record = todayAttendance.find(
      (a) => a.employee_id === employeeId && !a.check_out
    );

    if (!record) {
      alert("لم يتم تسجيل حضور لهذا الموظف");
      return;
    }

    const checkOutTime = new Date();
    const checkInTime = new Date(record.check_in);

    const diffMs = checkOutTime - checkInTime;
    const totalHours = diffMs / (1000 * 60 * 60);

    await supabase
      .from("attendance")
      .update({
        check_out: checkOutTime,
        total_hours: totalHours,
      })
      .eq("id", record.id);

    loadTodayAttendance();
  };

  return (
    <div className="p-10 text-white">
      <h2 className="text-2xl mb-6 font-bold">
        تسجيل الحضور والانصراف
      </h2>

      <div className="space-y-4">
        {employees.map((emp) => {
          const record = todayAttendance.find(
            (a) => a.employee_id === emp.id
          );

          return (
            <div
              key={emp.id}
              className="bg-white/10 p-4 rounded-xl flex justify-between items-center"
            >
              <div>
                <div className="font-bold">
                  {emp.full_name}
                </div>
              </div>

              <div className="flex gap-3">
                {!record && (
                  <button
                    onClick={() =>
                      handleCheckIn(emp.id)
                    }
                    className="bg-green-600 px-4 py-2 rounded-lg"
                  >
                    تسجيل حضور
                  </button>
                )}

                {record && !record.check_out && (
                  <button
                    onClick={() =>
                      handleCheckOut(emp.id)
                    }
                    className="bg-red-600 px-4 py-2 rounded-lg"
                  >
                    تسجيل انصراف
                  </button>
                )}

                {record && record.check_out && (
                  <span className="text-gray-400">
                    تم الانصراف
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Attendance;