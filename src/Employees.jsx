import { useEffect, useState } from "react";
import { supabase } from "./supabase";

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [name, setName] = useState("");

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    setEmployees(data || []);
  };

  const addEmployee = async () => {
    if (!name.trim()) return alert("اكتب اسم الموظف");

    const { error } = await supabase.from("employees").insert([
      { full_name: name }
    ]);

    if (error) {
  console.log(error);
  alert(error.message);
  return;
}

    setName("");
    loadEmployees();
  };

  return (
    <div className="p-10 text-white">
      <h2 className="text-2xl mb-6">إدارة الموظفين</h2>

      <div className="flex gap-4 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم الموظف"
          className="p-3 rounded-lg text-black"
        />
        <button
          onClick={addEmployee}
          className="bg-green-600 px-5 py-2 rounded-lg"
        >
          إضافة
        </button>
      </div>

      <div className="space-y-2">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className="bg-white/10 p-3 rounded-lg"
          >
            {emp.full_name}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Employees;