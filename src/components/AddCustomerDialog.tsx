import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Customer } from "../types";

interface AddCustomerDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  editCustomer?: Customer;
}

export function AddCustomerDialog({ open, onClose, onAdd, editCustomer }: AddCustomerDialogProps) {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [cellPhone, setCellPhone] = useState("");
  const [email, setEmail] = useState("");
  const [comments, setComments] = useState("");

  useEffect(() => {
    if (editCustomer) {
      setName(editCustomer.name);
      setSurname(editCustomer.surname);
      setCellPhone(editCustomer.cellPhone);
      setEmail(editCustomer.email);
      setComments(editCustomer.comments);
    } else {
      setName("");
      setSurname("");
      setCellPhone("");
      setEmail("");
      setComments("");
    }
  }, [editCustomer, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      name,
      surname,
      cellPhone,
      email,
      comments,
    });
    handleClose();
  };

  const handleClose = () => {
    setName("");
    setSurname("");
    setCellPhone("");
    setEmail("");
    setComments("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-labelledby="customer-dialog-title"
        aria-describedby="customer-dialog-description"
      >
        <DialogHeader>
          <DialogTitle id="customer-dialog-title">{editCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
          <DialogDescription id="customer-dialog-description">
            {editCustomer 
              ? "Update the customer information below. Required fields are marked with an asterisk (*)."
              : "Enter the customer details to add them to your database. Required fields are marked with an asterisk (*)."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">First Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John"
                required
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="surname">Last Name *</Label>
              <Input
                id="surname"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="Doe"
                required
                aria-required="true"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cellPhone">Cell Phone *</Label>
              <Input
                id="cellPhone"
                type="tel"
                value={cellPhone}
                onChange={(e) => setCellPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                required
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Comments</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any notes about this customer (preferences, sizes, special requests, etc.)"
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              aria-label="Cancel and close dialog"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              aria-label={editCustomer ? "Update customer" : "Add customer"}
            >
              {editCustomer ? "Update Customer" : "Add Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
