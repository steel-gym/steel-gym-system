const Dashboard = () => (
  <>
    {/* تسجيل حضور */}
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
          <option value="">اختر موظف</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
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

    {/* أفضل 3 */}
    <div className="px-10 mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
      {topThree.map((emp, index) => (
        <div
          key={index}
          className="bg-yellow-500/20 border border-yellow-400 p-6 rounded-2xl text-white shadow-xl text-center hover:scale-105 transition-all"
        >
          <h2 className="text-4xl">
            {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
          </h2>
          <p className="font-bold mt-2">{emp.name}</p>
          <p>عدد أيام الحضور: {emp.present}</p>
        </div>
      ))}
    </div>

    {lowPerformer && (
      <div className="px-10 mt-8">
        <div className="bg-red-600/20 border border-red-500 p-6 rounded-2xl text-white shadow-xl animate-pulse">
          ⚠ الموظف {lowPerformer.name} حضوره ضعيف هذا الشهر
        </div>
      </div>
    )}

    <div className="px-10 mt-10 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-8">
      <StatCard title="عدد الموظفين" value={stats.totalEmployees} filter="employees" />
      <StatCard title="الموجودين الآن" value={stats.presentNow} filter="presentNow" />
      <StatCard title="إجمالي ساعات اليوم" value={stats.totalHoursToday} filter="todayHours" />
      <StatCard title="غياب اليوم" value={stats.absentToday} filter="absentToday" />
      <StatCard title="حضور الشهر" value={stats.monthlyAttendance} filter="monthly" />
      <StatCard title="نسبة الحضور %" value={stats.attendanceRate} filter="attendanceRate" />
    </div>

    <div className="px-10 mt-16">
      <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl shadow-2xl">
        <h2 className="text-xl text-white mb-6">
          تحليل ساعات اليوم
        </h2>
        {chartData && <Bar data={chartData} />}
      </div>
    </div>
  </>
);