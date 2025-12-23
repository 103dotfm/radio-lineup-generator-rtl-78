import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { TranslationMapping, getTranslationMappings, createTranslationMapping, updateTranslationMapping, deleteTranslationMapping } from '@/lib/api/rds';
import { toast } from 'sonner';

export default function TranslationMappings() {
  const [mappings, setMappings] = useState<TranslationMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newMapping, setNewMapping] = useState({ hebrew: '', english: '' });
  const [editMapping, setEditMapping] = useState({ hebrew: '', english: '' });

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    try {
      const data = await getTranslationMappings();
      setMappings(data);
    } catch (error) {
      toast.error('Failed to load translation mappings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMapping = async () => {
    if (!newMapping.hebrew.trim() || !newMapping.english.trim()) {
      toast.error('Both Hebrew and English text are required');
      return;
    }

    try {
      await createTranslationMapping(newMapping.hebrew.trim(), newMapping.english.trim());
      setNewMapping({ hebrew: '', english: '' });
      await loadMappings();
      toast.success('Translation mapping added successfully');
    } catch (error) {
      toast.error('Failed to add translation mapping');
    }
  };

  const handleEditMapping = async (id: string) => {
    if (!editMapping.hebrew.trim() || !editMapping.english.trim()) {
      toast.error('Both Hebrew and English text are required');
      return;
    }

    try {
      await updateTranslationMapping(id, editMapping.hebrew.trim(), editMapping.english.trim());
      setEditingId(null);
      setEditMapping({ hebrew: '', english: '' });
      await loadMappings();
      toast.success('Translation mapping updated successfully');
    } catch (error) {
      toast.error('Failed to update translation mapping');
    }
  };

  const handleDeleteMapping = async (id: string) => {
    if (!confirm('Are you sure you want to delete this translation mapping?')) {
      return;
    }

    try {
      await deleteTranslationMapping(id);
      await loadMappings();
      toast.success('Translation mapping deleted successfully');
    } catch (error) {
      toast.error('Failed to delete translation mapping');
    }
  };

  const startEditing = (mapping: TranslationMapping) => {
    setEditingId(mapping.id);
    setEditMapping({ hebrew: mapping.hebrew_text, english: mapping.english_text });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditMapping({ hebrew: '', english: '' });
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Translation Mappings</CardTitle>
          <CardDescription>
            Manage Hebrew to English translation mappings for RDS radio text generation.
            These mappings are used to automatically translate show names and hosts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add new mapping */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label htmlFor="new-hebrew">Hebrew Text</Label>
              <Input
                id="new-hebrew"
                value={newMapping.hebrew}
                onChange={(e) => setNewMapping(prev => ({ ...prev, hebrew: e.target.value }))}
                placeholder="עם"
                dir="rtl"
              />
            </div>
            <div>
              <Label htmlFor="new-english">English Text</Label>
              <Input
                id="new-english"
                value={newMapping.english}
                onChange={(e) => setNewMapping(prev => ({ ...prev, english: e.target.value }))}
                placeholder="with"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddMapping} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Mapping
              </Button>
            </div>
          </div>

          {/* Mappings table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hebrew Text</TableHead>
                  <TableHead>English Text</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No translation mappings found
                    </TableCell>
                  </TableRow>
                ) : (
                  mappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell dir="rtl" className="font-medium">
                        {editingId === mapping.id ? (
                          <Input
                            value={editMapping.hebrew}
                            onChange={(e) => setEditMapping(prev => ({ ...prev, hebrew: e.target.value }))}
                            dir="rtl"
                          />
                        ) : (
                          mapping.hebrew_text
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === mapping.id ? (
                          <Input
                            value={editMapping.english}
                            onChange={(e) => setEditMapping(prev => ({ ...prev, english: e.target.value }))}
                          />
                        ) : (
                          mapping.english_text
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === mapping.id ? (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleEditMapping(mapping.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditing}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditing(mapping)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteMapping(mapping.id)}
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
