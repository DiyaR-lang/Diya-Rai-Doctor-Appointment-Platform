import Layout from "../../components/Layout.jsx";

export default function AdminDashboard() {
  return (
    <Layout
      title="🛠️ Admin Dashboard"
      links={[
        { label: "Users", href: "#" },
        { label: "Approve Doctors", href: "#" },
        { label: "All Appointments", href: "#" },
      ]}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-xl">👥 Total Users</div>
        <div className="bg-green-50 p-4 rounded-xl">🧑‍⚕️ Doctors</div>
        <div className="bg-purple-50 p-4 rounded-xl">📊 Appointments</div>
      </div>
    </Layout>
  );
}
