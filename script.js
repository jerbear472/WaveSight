// script.js
const ctx = document.getElementById('trendChart').getContext('2d');

const gradient1 = ctx.createLinearGradient(0, 0, 0, 300);
gradient1.addColorStop(0, 'rgba(94, 227, 255, 0.8)');
gradient1.addColorStop(1, 'rgba(94, 227, 255, 0.05)');

const gradient2 = ctx.createLinearGradient(0, 0, 0, 300);
gradient2.addColorStop(0, 'rgba(139, 92, 246, 0.8)');
gradient2.addColorStop(1, 'rgba(139, 92, 246, 0.05)');

const gradient3 = ctx.createLinearGradient(0, 0, 0, 300);
gradient3.addColorStop(0, 'rgba(236, 72, 153, 0.8)');
gradient3.addColorStop(1, 'rgba(236, 72, 153, 0.05)');

const gradient4 = ctx.createLinearGradient(0, 0, 0, 300);
gradient4.addColorStop(0, 'rgba(249, 115, 22, 0.8)');
gradient4.addColorStop(1, 'rgba(249, 115, 22, 0.05)');

const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['Mar 1', 'Mar 7', 'Mar 14', 'Mar 21', 'Mar 28'],
    datasets: [
      {
        label: 'AI-generated images',
        data: [35, 45, 60, 70, 84],
        fill: true,
        backgroundColor: gradient1,
        borderColor: '#5ee3ff',
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'ChatGPT',
        data: [20, 34, 50, 65, 79],
        fill: true,
        backgroundColor: gradient2,
        borderColor: '#8b5cf6',
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'Elden Ring',
        data: [15, 25, 40, 55, 69],
        fill: true,
        backgroundColor: gradient3,
        borderColor: '#ec4899',
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'Pineapple on pizza',
        data: [10, 18, 30, 40, 53],
        fill: true,
        backgroundColor: gradient4,
        borderColor: '#f97316',
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: '#e5e7eb',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#a1a1aa',
        },
        grid: {
          color: 'rgba(255,255,255,0.05)',
        },
      },
      y: {
        ticks: {
          color: '#a1a1aa',
        },
        grid: {
          color: 'rgba(255,255,255,0.05)',
        },
      },
    },
  },
});
