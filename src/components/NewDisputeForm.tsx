import React, { useState } from "react";
import googleSheetsAPI, { DisputeData } from "../services/googleSheets";

export const NewDisputeForm: React.FC = () => {
  const [formData, setFormData] = useState<DisputeData>({
    OrderItemID: "",
    TrackingID: "",
    ReasonforDispute: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await googleSheetsAPI.createDispute(formData);
      setMessage("Dispute created successfully!");
      setFormData({
        OrderItemID: "",
        TrackingID: "",
        ReasonforDispute: "",
      });
    } catch (error) {
      console.error(error);
      setMessage("Failed to create dispute. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">Create New Dispute</h2>

      {message && (
        <div className="mb-4 text-sm text-center text-blue-600">{message}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Order Item ID</label>
          <input
            type="text"
            name="OrderItemID"
            value={formData.OrderItemID}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Tracking ID</label>
          <input
            type="text"
            name="TrackingID"
            value={formData.TrackingID}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Reason for Dispute</label>
          <textarea
            name="ReasonforDispute"
            value={formData.ReasonforDispute}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit Dispute"}
        </button>
      </form>
    </div>
  );
};
