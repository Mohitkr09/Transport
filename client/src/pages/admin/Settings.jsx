import React, { useState } from "react";

const Settings = () => {
  const [settings, setSettings] = useState({
    systemName: "TransportX",
    email: "admin@transportx.com",
    phone: "",
    darkMode: false,
    notifications: true
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const handleSave = () => {
    console.log("Saved Settings:", settings);
    alert("Settings saved successfully!");
  };

  return (
    <div className="max-w-6xl mx-auto">

      {/* PAGE HEADER */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Admin Settings
        </h1>
        <p className="text-gray-500 mt-1">
          Manage platform configuration and preferences
        </p>
      </div>


      {/* GRID */}
      <div className="grid md:grid-cols-2 gap-8">

        {/* ================= SYSTEM SETTINGS ================= */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-7">

          <h2 className="text-lg font-semibold mb-6 text-gray-800 dark:text-white">
            System Configuration
          </h2>

          <div className="space-y-5">

            <Field
              label="System Name"
              name="systemName"
              value={settings.systemName}
              onChange={handleChange}
            />

            <Field
              label="Contact Email"
              name="email"
              value={settings.email}
              onChange={handleChange}
            />

            <Field
              label="Support Phone"
              name="phone"
              value={settings.phone}
              onChange={handleChange}
            />

          </div>
        </div>



        {/* ================= UI SETTINGS ================= */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-7">

          <h2 className="text-lg font-semibold mb-6 text-gray-800 dark:text-white">
            Interface Preferences
          </h2>

          <div className="space-y-6">

            <Toggle
              label="Dark Mode"
              name="darkMode"
              checked={settings.darkMode}
              onChange={handleChange}
            />

            <Toggle
              label="Notifications"
              name="notifications"
              checked={settings.notifications}
              onChange={handleChange}
            />

          </div>

        </div>
      </div>



      {/* ================= SAVE BAR ================= */}
      <div className="sticky bottom-0 mt-12 bg-white dark:bg-gray-900 border-t dark:border-gray-700 p-6 flex justify-between items-center rounded-xl shadow-lg">

        <p className="text-sm text-gray-500">
          Changes are not saved yet
        </p>

        <button
          onClick={handleSave}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-semibold shadow"
        >
          Save Changes
        </button>

      </div>
    </div>
  );
};



/* ================= INPUT FIELD ================= */
const Field = ({ label, ...props }) => (
  <div>
    <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">
      {label}
    </label>

    <input
      {...props}
      className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900"
    />
  </div>
);



/* ================= TOGGLE SWITCH ================= */
const Toggle = ({ label, checked, ...props }) => (
  <div className="flex items-center justify-between">

    <span className="text-gray-700 dark:text-gray-200 font-medium">
      {label}
    </span>

    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        {...props}
        className="sr-only peer"
      />

      <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:bg-indigo-600 transition" />

      <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-6" />
    </label>

  </div>
);

export default Settings;
