import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { Trash2, Edit, MessageCircle } from "lucide-react";

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [currentEmail, setCurrentEmail] = useState(null);

  const OWNER_EMAIL = "engmo7amed@gmail.com";

  useEffect(() => {
    loadEmployees();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data } = await supabase.auth.getUser();
    setCurrentEmail(data?.user?.email || null);
  };

  const loadEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    setEmployees(data || []);
  };

  const isValidPhone = (number) => {
    return /^\d{11}$/.test(number);
  };

  const handleSave = async () => {
    if (!name.trim()) return alert("اكتب اسم الموظف");
    if (!phone.trim()) return alert("اكتب رقم التليفون");

    if (!isValidPhone(phone))
      return alert("رقم التليفون لازم يكون 11 رقم");

    const exists = employees.find(
      (e) => e.phone === phone && e.id !== editingId
    );

    if (exists) return alert("الرقم موجود بالفعل");

    if (editingId) {
      if (currentEmail !== OWNER_EMAIL) {
        return alert("غير مسموح لك بالتعديل");
      }

      await supabase
        .from("employees")
        .update({ full_name: name, phone })
        .eq("id", editingId);

      await supabase.from("employee_logs").insert([
        {
          employee_id: editingId,
          action: "update",
          performed_by: currentEmail,
        },
      ]);

      setEditingId(null);
    } else {
      const { data, error } = await supabase
        .from("employees")
        .insert([{ full_name: name, phone }])
        .select();

      if (error) {
        alert(error.message);
        return;
      }

      await supabase.from("employee_logs").insert([
        {
          employee_id: data[0].id,
          action: "add",
          performed_by: currentEmail,
        },
      ]);
    }

    setName("");
    setPhone("");
    loadEmployees();
  };

  const handleDelete = async (id) => {
    if (currentEmail !== OWNER_EMAIL) {
      return alert("غير مسموح لك بالحذف");
    }

    if (!window.confirm("متأكد من الحذف؟")) return;

    await supabase.from("employees").delete().eq("id", id);

    await supabase.from("employee_logs").insert([
      {
        employee_id: id,
        action: "delete",
        performed_by: currentEmail,
      },
    ]);

    loadEmployees();
  };

  const handleEdit = (emp) => {
    if (currentEmail !== OWNER_EMAIL) {
      return alert("غير مسموح لك بالتعديل");
    }

    setName(emp.full_name);
    setPhone(emp.phone);
    setEditingId(emp.id);
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.full_name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      emp.phone.includes(search)
  );

  return (
    <div className="p-10 text-white">
      <h2 className="text-2xl mb-6">إدارة الموظفين</h2>

      <input
        placeholder="بحث بالاسم أو الرقم"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="p-3 rounded-lg text-black mb-6 w-full"
      />

      <div className="flex gap-4 mb-6 flex-wrap">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم الموظف"
          className="p-3 rounded-lg text-black"
        />

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="رقم التليفون"
          className="p-3 rounded-lg text-black"
        />

        <button
          onClick={handleSave}
          className="bg-green-600 px-5 py-2 rounded-lg"
        >
          {editingId ? "تحديث" : "إضافة"}
        </button>
      </div>

      <div className="space-y-3">
        {filteredEmployees.map((emp) => (
          <div
            key={emp.id}
            className="bg-white/10 p-4 rounded-lg flex justify-between items-center"
          >
            <div>
              <div className="font-bold">{emp.full_name}</div>
              <div className="text-gray-300 text-sm">
                {emp.phone}
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href={`https://wa.me/2${emp.phone}`}
                target="_blank"
                rel="noreferrer"
                className="text-green-400 hover:scale-110 transition"
              >
                <MessageCircle size={20} />
              </a>

              {currentEmail === OWNER_EMAIL && (
                <>
                  <button
                    onClick={() => handleEdit(emp)}
                    className="text-blue-400 hover:scale-110 transition"
                  >
                    <Edit size={20} />
                  </button>

                  <button
                    onClick={() => handleDelete(emp.id)}
                    className="text-red-400 hover:scale-110 transition"
                  >
                    <Trash2 size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Employees;