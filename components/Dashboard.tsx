import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/api';
import type { Plant, Category } from '../types';
import { Card, Spinner, Button, Badge } from './ui';

// FIX: Explicitly type PlantCard as a React.FC to handle the 'key' prop correctly in lists.
const PlantCard: React.FC<{ plant: Plant, categoryName?: string }> = ({ plant, categoryName }) => {
    return (
        <a href={`#/plant/${plant.id}`}>
            <Card className="h-full transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:bg-slate-800">
                <div className="p-4 flex flex-col justify-between h-full">
                    <div>
                        <div className="flex justify-between items-start gap-2">
                             <div className="flex-1">
                                <p className="font-bold text-lg text-emerald-800 dark:text-emerald-300 truncate" title={plant.nickname || plant.commonName}>{plant.nickname || plant.commonName}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 italic truncate">{plant.species}</p>
                            </div>
                            {categoryName && <Badge className="flex-shrink-0">{categoryName}</Badge>}
                        </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                        {`Added on ${new Date(plant.createdAt).toLocaleDateString()}`}
                    </div>
                </div>
            </Card>
        </a>
    );
};


const CategoryManager = ({
    categories,
    onAddCategory,
    onDeleteCategory,
    onClose
}: {
    categories: Category[],
    onAddCategory: (name: string) => Promise<void>,
    onDeleteCategory: (id: string) => Promise<void>,
    onClose: () => void
}) => {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim() || isAdding) return;
        setIsAdding(true);
        await onAddCategory(newCategoryName.trim());
        setNewCategoryName('');
        setIsAdding(false);
    };

    return (
        <Card className="mb-6">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h2 className="text-lg font-semibold">Manage Categories</h2>
                <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">&times;</button>
            </div>
            <div className="p-4 space-y-4">
                 <form onSubmit={handleAdd} className="flex gap-2">
                    <input 
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="New category name..."
                        className="flex-grow block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base"
                    />
                    <Button type="submit" disabled={isAdding || !newCategoryName.trim()}>
                        {isAdding ? 'Adding...' : 'Add'}
                    </Button>
                </form>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                    {categories.length > 0 ? categories.map(cat => (
                        <div key={cat.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded-md">
                            <span className="text-sm">{cat.name}</span>
                            <button onClick={() => onDeleteCategory(cat.id)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-xs font-semibold">DELETE</button>
                        </div>
                    )) : <p className="text-sm text-center text-slate-500 dark:text-slate-400">No categories created yet.</p>}
                </div>
            </div>
        </Card>
    );
}

export const Dashboard = () => {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showCatManager, setShowCatManager] = useState(false);

  const fetchData = async () => {
      setLoading(true);
      const [plantList, categoryList] = await Promise.all([db.getPlants(), db.getCategories()]);
      setPlants(plantList);
      setCategories(categoryList);
      setLoading(false);
  };
    
  useEffect(() => {
    fetchData();
  }, []);
  
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);

  const filteredPlants = useMemo(() => {
    if (activeFilter === 'all') return plants;
    if (activeFilter === 'uncategorized') return plants.filter(p => !p.categoryId);
    return plants.filter(p => p.categoryId === activeFilter);
  }, [plants, activeFilter]);

  const handleAddCategory = async (name: string) => {
    await db.addCategory(name);
    const categoryList = await db.getCategories();
    setCategories(categoryList);
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm("Are you sure? Deleting a category will uncategorize any plants within it.")) {
        await db.deleteCategory(id);
        fetchData(); // Refetch everything to ensure state is consistent
    }
  };

  // FIX: Explicitly type FilterButton as a React.FC to handle the 'key' prop correctly in lists.
  const FilterButton: React.FC<{ filterId: string, label: string }> = ({ filterId, label }) => {
    const isActive = activeFilter === filterId;
    return (
        <button
            onClick={() => setActiveFilter(filterId)}
            className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}
        >
            {label}
        </button>
    )
  }

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/50 dark:to-teal-900/50 border border-emerald-100 dark:border-emerald-900">
        <div>
            <div>
                <h1 className="text-3xl font-bold text-emerald-800 dark:text-emerald-300">Plantia</h1>
                <p className="mt-2 text-slate-600 dark:text-slate-400">Welcome to your digital greenhouse. Here are your beloved plants, ready for some TLC.</p>
            </div>
             <Button variant="primary" onClick={() => setShowCatManager(!showCatManager)} className="mt-4">Manage Categories</Button>
        </div>
      </div>
      
      {showCatManager && <CategoryManager categories={categories} onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory} onClose={() => setShowCatManager(false)} />}

      {loading ? (
        <Spinner />
      ) : plants.length > 0 ? (
        <>
        <div className="flex flex-wrap gap-2 items-center">
            <FilterButton filterId="all" label="All" />
            {categories.map(cat => <FilterButton key={cat.id} filterId={cat.id} label={cat.name} />)}
            <FilterButton filterId="uncategorized" label="Uncategorized" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlants.map((plant) => (
            <PlantCard key={plant.id} plant={plant} categoryName={plant.categoryId ? categoryMap.get(plant.categoryId) : undefined} />
          ))}
        </div>
        </>
      ) : (
        <div className="text-center py-16 px-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-slate-700 dark:text-slate-300">No plants yet!</h2>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Click the "+" button below to start your collection.</p>
          <a href="#/add" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700">
            Add Your First Plant
          </a>
        </div>
      )}
    </div>
  );
};