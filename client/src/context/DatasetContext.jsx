import React, { createContext, useContext, useState, useEffect } from 'react';

const DatasetContext = createContext();

export function DatasetProvider({ children }) {
  const [datasets, setDatasets] = useState([]);
  const [activeDataset, setActiveDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [constellationFilter, setConstellationFilter] = useState(null);

  // Fetch list of datasets on mount
  const fetchDatasets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/datasets');
      if (!res.ok) throw new Error('Failed to fetch datasets list');
      const data = await res.json();
      setDatasets(data);

      // Auto-select first dataset if none selected
      if (data.length > 0 && !activeDataset) {
        await selectDataset(data[0].id);
      }
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
      if (!res.ok) throw new Error('Failed to load dataset details');
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

  // Upload custom CSV file
  const uploadDataset = async (file, customName) => {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      if (customName) formData.append('name', customName);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Upload failed');
      }

      const result = await res.json();
      const newDataset = result.dataset;

      // Update datasets list
      setDatasets((prev) => [
        {
          id: newDataset.id,
          name: newDataset.name,
          filename: newDataset.filename,
          row_count: newDataset.rowCount,
          col_count: newDataset.colCount,
          columns: newDataset.columns,
          created_at: newDataset.createdAt,
          isSample: false
        },
        ...prev
      ]);

      // Set as active dataset
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

  // Delete custom dataset
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

  useEffect(() => {
    fetchDatasets();
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
        constellationFilter,
        setConstellationFilter
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
