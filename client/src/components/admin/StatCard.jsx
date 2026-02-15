const StatCard = ({ title, value }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
      <p className="text-gray-500">{title}</p>
      <h3 className="text-3xl font-bold text-indigo-600 mt-2">
        {value}
      </h3>
    </div>
  );
};

export default StatCard;
