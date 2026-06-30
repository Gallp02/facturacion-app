import { createContext, useContext, useState, useEffect } from 'react';
import { empresasAPI } from '../services/api';

const EmpresaContext = createContext(null);

export function EmpresaProvider({ children }) {
  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);

  useEffect(() => {
    loadEmpresas();
  }, []);

  const loadEmpresas = async () => {
    try {
      const res = await empresasAPI.getAll();
      setEmpresas(res.data);
      const savedId = localStorage.getItem('empresa_id');
      const found = res.data.find(e => e.id === parseInt(savedId));
      setSelectedEmpresa(found || res.data[0] || null);
    } catch {
      setEmpresas([]);
    }
  };

  const selectEmpresa = (empresa) => {
    setSelectedEmpresa(empresa);
    localStorage.setItem('empresa_id', empresa.id);
  };

  return (
    <EmpresaContext.Provider value={{ empresas, selectedEmpresa, selectEmpresa, loadEmpresas, setEmpresas }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export const useEmpresa = () => useContext(EmpresaContext);
