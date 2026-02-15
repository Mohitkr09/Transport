const DriverTable = ({ drivers, onApprove, onReject }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <h3 className="text-xl font-semibold mb-4">
        Pending Driver Approvals
      </h3>

      {drivers.length === 0 ? (
        <p className="text-gray-500">No pending drivers 🎉</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="pb-2">Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {drivers.map((d) => (
              <tr key={d._id} className="border-b">
                <td className="py-3">{d.name}</td>
                <td>{d.email}</td>
                <td>{d.phone}</td>
                <td className="space-x-2">
                  <button
                    onClick={() => onApprove(d._id)}
                    className="px-3 py-1 bg-green-500 text-white rounded"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onReject(d._id)}
                    className="px-3 py-1 bg-red-500 text-white rounded"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DriverTable;
