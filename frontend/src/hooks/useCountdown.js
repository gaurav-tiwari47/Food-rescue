// src/hooks/useCountdown.js
// PURPOSE: Custom hook that returns a live countdown string until a target date.
//          Updates every second. Returns "Expired" when target is in the past.
//          Used by FoodCard to show the 30-minute pickup window countdown.
// USAGE:   const { label, isExpired, secondsLeft } = useCountdown(food.claimExpiresAt);

import { useState, useEffect } from "react";

const useCountdown = (targetDate) => {
  const calculateRemaining = () => {
    if (!targetDate) return { label: "", isExpired: true, secondsLeft: 0 };

    const diff = new Date(targetDate) - new Date();
    if (diff <= 0) return { label: "Expired", isExpired: true, secondsLeft: 0 };

    const totalSeconds = Math.floor(diff / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const label =
      minutes > 0
        ? `${minutes}m ${String(seconds).padStart(2, "0")}s`
        : `${seconds}s`;

    return { label: `Pickup in ${label}`, isExpired: false, secondsLeft: totalSeconds };
  };

  const [state, setState] = useState(calculateRemaining);

  useEffect(() => {
    if (!targetDate) return;

    // Update every second
    const interval = setInterval(() => {
      const next = calculateRemaining();
      setState(next);

      // Stop ticking once expired
      if (next.isExpired) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate]);

  return state;
};

export default useCountdown;
