'use client';

import { useState, useTransition, useEffect } from 'react';
import { getRegistrationFields, createFieldAction, deleteFieldAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from 'lucide-react';

export default function PageInscription() {
    const [fields, setFields] = useState<any[]>([]);
    const [selectedType, setSelectedType] = useState('text');
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        startTransition(async () => {
            const data = await getRegistrationFields();
            setFields(data);
        });
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        await deleteFieldAction(id);
        const data = await getRegistrationFields();
        setFields(data);
    };

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-8">Page Inscription Management</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Field</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={async (formData) => {
                            await createFieldAction(formData);
                            const data = await getRegistrationFields();
                            setFields(data);
                            (document.getElementById('create-field-form') as HTMLFormElement).reset();
                        }} id="create-field-form" className="space-y-4">
                            <div>
                                <Label htmlFor="name">Internal Name (Key)</Label>
                                <Input name="name" id="name" required placeholder="e.g. business_license" />
                            </div>
                            <div>
                                <Label htmlFor="label">Display Label</Label>
                                <Input name="label" id="label" required placeholder="e.g. Business License Number" />
                            </div>
                            <div>
                                <Label htmlFor="type">Type</Label>
                                <Select name="type" required defaultValue="text" onValueChange={setSelectedType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text">Text</SelectItem>
                                        <SelectItem value="number">Number</SelectItem>
                                        <SelectItem value="select">Select Dropdown</SelectItem>
                                        <SelectItem value="boolean">Checkbox (Yes/No)</SelectItem>
                                        <SelectItem value="date">Date</SelectItem>
                                        <SelectItem value="file">File Upload</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedType === 'file' && (
                                <div className="space-y-4 border-l-2 pl-4 border-muted">
                                    <div>
                                        <Label htmlFor="maxFileSize">Max File Size (bytes)</Label>
                                        <Input type="number" name="maxFileSize" id="maxFileSize" placeholder="e.g. 5242880 for 5MB" />
                                    </div>
                                    <div>
                                        <Label htmlFor="allowedMimeTypes">Allowed File Types (comma separated)</Label>
                                        <Input name="allowedMimeTypes" id="allowedMimeTypes" placeholder="e.g. image/png, application/pdf" />
                                    </div>
                                </div>
                            )}

                            <div>
                                <Label htmlFor="order">Order (Target Position)</Label>
                                <Input type="number" name="order" id="order" defaultValue="0" />
                            </div>
                            <div>
                                <Label htmlFor="placeholder">Placeholder</Label>
                                <Input name="placeholder" id="placeholder" />
                            </div>
                            <div>
                                <Label htmlFor="description">Help Text</Label>
                                <Input name="description" id="description" />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox name="required" id="required" />
                                <Label htmlFor="required">Required Field</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox name="enabled" id="enabled" defaultChecked />
                                <Label htmlFor="enabled">Enabled</Label>
                            </div>

                            <div>
                                <Label htmlFor="options">Options (for Select type only)</Label>
                                <Input name="options" id="options" placeholder="value:Label, value2:Label2" />
                                <p className="text-xs text-muted-foreground">Format: value:Label, value2:Label2</p>
                            </div>

                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Saving...' : 'Add Field'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Existing Fields</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {fields.map((field) => (
                                <div key={field.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <div className="font-semibold">{field.label}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {field.name} ({field.type}) - Order: {field.order}
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(field.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                            {fields.length === 0 && (
                                <div className="text-center text-muted-foreground py-8">
                                    No dynamic fields configured yet.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
