import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

export function useLogout() {
  const navigate = useNavigate();
  return useCallback(() => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login");
  }, [navigate]);
}
