"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type DataPoint = {
  date: string;
  steamPrice: number;
  externalPrice: number | null;
}

export default function PriceChart({ data }: { data: DataPoint[] }) {
  if (!data || data.length === 0) return <p className="text-gray-400">Brak historycznych danych do narysowania wykresu.</p>;

  return (
    <div className="h-[400px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#9ca3af" tick={{fill: '#9ca3af'}} />
          <YAxis stroke="#9ca3af" tick={{fill: '#9ca3af'}} domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '0.5rem' }} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Line type="monotone" dataKey="steamPrice" stroke="#f97316" strokeWidth={3} activeDot={{ r: 8 }} name="Cena Steam ($)" />
          <Line type="monotone" dataKey="externalPrice" stroke="#22c55e" strokeWidth={3} name="Cena Zewnętrzna ($)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
