import { useNavigate } from "react-router-dom";

export default function PaymentFailed(){
  const nav = useNavigate();

  return (
    <div className="h-screen flex items-center justify-center">

      <div className="bg-white p-10 rounded-3xl shadow-xl text-center">
        <h1 className="text-3xl font-bold text-red-500">
          Payment Failed ❌
        </h1>

        <button
          onClick={()=>nav("/")}
          className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl"
        >
          Try Again
        </button>
      </div>

    </div>
  );
}