const StatsCard = ({ title, value, icon }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className="mr-3">
          {icon}
        </div>
        <div>
          <h4 className="text-sm text-gray-500 font-medium">{title}</h4>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;