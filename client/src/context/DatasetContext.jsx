import React, { createContext, useContext, useState, useEffect } from 'react';

const DatasetContext = createContext();

export function DatasetProvider({ children }) {
  const [datasets, setDatasets] = useState([]);
  const [activeDataset, setActiveDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [constellationFilter, setConstellationFilter] = useState(null);

  // Real per-user auth — the session lives in an httpOnly cookie the browser
  // sends automatically, so the client never touches a token directly; `user`
  // is just a cache of GET /api/auth/me, re-fetched after login/signup/logout.
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/auth/me');
      setUser(res.ok ? (await res.json()).user : null);
    } catch {
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  };

  const signup = async (email, password, displayName) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    setUser(data.user);
    await fetchDatasets();
    return data.user;
  };

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setUser(data.user);
    await fetchDatasets();
    return data.user;
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    await fetchDatasets();
  };

  // Fetch list of datasets visible to the current viewer (public + owned +
  // shared-with-them — the server does the access filtering, not the client).
  const fetchDatasets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/datasets');
      if (!res.ok) throw new Error('Failed to fetch datasets list');
      const data = await res.json();
      setDatasets(data);

      setActiveDataset((prevActive) => {
        if (prevActive && data.some((d) => d.id === prevActive.id)) {
          return prevActive; // still visible/valid, keep it (avoids a reselect flicker)
        }
        if (data.length > 0) {
          selectDataset(data[0].id); // fire and forget — updates activeDataset once loaded
        }
        return prevActive && data.length > 0 ? prevActive : null;
      });
    } catch (err) {
      console.error('Fetch Datasets Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Select a dataset by ID and load full content
  const selectDataset = async (id) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/datasets/${id}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to load dataset details');
      }
      const dataset = await res.json();
      setActiveDataset(dataset);
      return dataset;
    } catch (err) {
      console.error('Select Dataset Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Upload a CSV/Excel file (requires login — the server enforces this too)
  const uploadDataset = async (file, customName) => {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      if (customName) formData.append('name', customName);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Upload failed');
      }

      const result = await res.json();
      const newDataset = result.dataset;

      setDatasets((prev) => [
        {
          id: newDataset.id,
          name: newDataset.name,
          filename: newDataset.filename,
          row_count: newDataset.rowCount,
          col_count: newDataset.colCount,
          columns: newDataset.columns,
          created_at: newDataset.createdAt,
          isSample: false,
          access: 'owner'
        },
        ...prev
      ]);

      setActiveDataset(newDataset);
      return { ...newDataset, warnings: result.warnings || [] };
    } catch (err) {
      console.error('Upload Error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete a dataset you own
  const deleteDataset = async (id) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/datasets/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete dataset');
      }

      setDatasets((prev) => prev.filter((d) => d.id !== id));

      if (activeDataset?.id === id) {
        const remaining = datasets.filter((d) => d.id !== id);
        if (remaining.length > 0) {
          await selectDataset(remaining[0].id);
        } else {
          setActiveDataset(null);
        }
      }
    } catch (err) {
      console.error('Delete Dataset Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Grant another registered user view access to a dataset you own
  const shareDataset = async (id, email) => {
    const res = await fetch(`/api/datasets/${id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to share dataset');
    return data;
  };

  const getDatasetShares = async (id) => {
    const res = await fetch(`/api/datasets/${id}/shares`);
    if (!res.ok) throw new Error('Failed to load share list');
    return res.json();
  };

  const revokeDatasetShare = async (id, userId) => {
    const res = await fetch(`/api/datasets/${id}/shares/${userId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to revoke access');
    return res.json();
  };

  useEffect(() => {
    (async () => {
      await fetchMe();
      await fetchDatasets();
    })();
  }, []);

  return (
    <DatasetContext.Provider
      value={{
        datasets,
        activeDataset,
        loading,
        error,
        fetchDatasets,
        selectDataset,
        uploadDataset,
        deleteDataset,
        shareDataset,
        getDatasetShares,
        revokeDatasetShare,
        constellationFilter,
        setConstellationFilter,
        user,
        authChecked,
        signup,
        login,
        logout
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
}

export function useDataset() {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
}
