// src/components/Loader.jsx
// PURPOSE: Reusable loading spinner shown during API calls.

const Loader = ({ text = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-600 animate-spin" />
      </div>
      <p className="text-stone-500 text-sm font-medium">{text}</p>
    </div>
  );
};

export default Loader;
