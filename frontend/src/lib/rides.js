export const rides = [
  {
    id: "bng-mys-0730",
    from: "Bengaluru",
    to: "Mysuru",
    date: "Fri, 31 Jul",
    departTime: "07:30",
    arriveTime: "10:45",
    duration: "3h 15m",
    price: 449,
    seatsAvailable: 3,
    womenOnly: false,
    instantBook: true,
    driver: {
      name: "Arjun Mehta",
      initials: "AM",
      trustScore: 96,
      rating: 4.9,
      trips: 214,
      verified: ["Govt ID", "Face match", "Vehicle docs"],
      car: "Hyundai Verna \xB7 White",
      joined: "2023",
    },
    stops: ["Kengeri", "Ramanagara", "Mandya"],
    perks: ["Live tracking", "Max 2 in back", "AC"],
  },
  {
    id: "pun-mum-0730",
    from: "Pune",
    to: "Mumbai",
    date: "Fri, 31 Jul",
    departTime: "06:00",
    arriveTime: "09:20",
    duration: "3h 20m",
    price: 599,
    seatsAvailable: 2,
    womenOnly: true,
    instantBook: true,
    driver: {
      name: "Nisha Rao",
      initials: "NR",
      trustScore: 99,
      rating: 5,
      trips: 388,
      verified: ["Govt ID", "Face match", "Vehicle docs", "Employer"],
      car: "Toyota Innova \xB7 Silver",
      joined: "2022",
    },
    stops: ["Lonavala", "Panvel"],
    perks: ["Women-only", "SOS enabled", "Luggage space"],
  },
  {
    id: "del-jai-0731",
    from: "Delhi",
    to: "Jaipur",
    date: "Sat, 1 Aug",
    departTime: "05:45",
    arriveTime: "10:30",
    duration: "4h 45m",
    price: 749,
    seatsAvailable: 4,
    womenOnly: false,
    instantBook: false,
    driver: {
      name: "Vikram Singh",
      initials: "VS",
      trustScore: 91,
      rating: 4.7,
      trips: 132,
      verified: ["Govt ID", "Vehicle docs"],
      car: "Mahindra XUV700 \xB7 Grey",
      joined: "2024",
    },
    stops: ["Gurugram", "Behror", "Kotputli"],
    perks: ["Live tracking", "Music on request"],
  },
  {
    id: "hyd-vij-0731",
    from: "Hyderabad",
    to: "Vijayawada",
    date: "Sat, 1 Aug",
    departTime: "13:15",
    arriveTime: "18:00",
    duration: "4h 45m",
    price: 680,
    seatsAvailable: 1,
    womenOnly: false,
    instantBook: true,
    driver: {
      name: "Sana Fatima",
      initials: "SF",
      trustScore: 94,
      rating: 4.8,
      trips: 97,
      verified: ["Govt ID", "Face match"],
      car: "Honda City \xB7 Blue",
      joined: "2024",
    },
    stops: ["Suryapet", "Nandigama"],
    perks: ["Live tracking", "Pet friendly"],
  },
  {
    id: "che-pon-0801",
    from: "Chennai",
    to: "Pondicherry",
    date: "Sun, 2 Aug",
    departTime: "08:00",
    arriveTime: "11:00",
    duration: "3h 00m",
    price: 399,
    seatsAvailable: 3,
    womenOnly: false,
    instantBook: true,
    driver: {
      name: "Karthik Iyer",
      initials: "KI",
      trustScore: 88,
      rating: 4.6,
      trips: 61,
      verified: ["Govt ID", "Face match"],
      car: "Maruti Baleno \xB7 Red",
      joined: "2025",
    },
    stops: ["Chengalpattu", "Tindivanam"],
    perks: ["Coastal route", "AC"],
  },
  {
    id: "ahm-udr-0801",
    from: "Ahmedabad",
    to: "Udaipur",
    date: "Sun, 2 Aug",
    departTime: "16:30",
    arriveTime: "21:15",
    duration: "4h 45m",
    price: 820,
    seatsAvailable: 2,
    womenOnly: true,
    instantBook: false,
    driver: {
      name: "Priya Shah",
      initials: "PS",
      trustScore: 97,
      rating: 4.9,
      trips: 176,
      verified: ["Govt ID", "Face match", "Vehicle docs"],
      car: "Tata Nexon \xB7 Green",
      joined: "2023",
    },
    stops: ["Himatnagar", "Shamlaji"],
    perks: ["Women-only", "Family tracking link"],
  },
];
export function getRide(id) {
  return rides.find((r) => r.id === id);
}
export function filterRides(from, to, womenOnly) {
  return rides.filter((r) => {
    const okFrom = !from || r.from.toLowerCase().includes(from.toLowerCase());
    const okTo = !to || r.to.toLowerCase().includes(to.toLowerCase());
    const okWomen = !womenOnly || r.womenOnly;
    return okFrom && okTo && okWomen;
  });
}

export const getShortAddress = (fullAddress) => {
  if (!fullAddress) return "";
  const parts = fullAddress.split(", ");
  return parts.length > 0 ? parts[0] : fullAddress;
};

export function normalizeRide(apiRide) {
  if (!apiRide) return null;
  // If it's already in the frontend format (mock data), return as-is
  if (apiRide.from && apiRide.to && apiRide.driver && typeof apiRide.driverId === "undefined") {
    return apiRide;
  }

  const departureDate = new Date(apiRide.dateTime);
  const departTimeStr = departureDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Fallback arrival calculation: departure + 3 hours
  const arrivalDate = new Date(departureDate.getTime() + 3 * 60 * 60 * 1000);
  const arriveTimeStr = arrivalDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const driver = apiRide.driverId || {};
  const initials = driver.name
    ? driver.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return {
    id: apiRide._id,
    from: getShortAddress(apiRide.origin?.address),
    to: getShortAddress(apiRide.destination?.address),
    fullFrom: apiRide.origin?.address,
    fullTo: apiRide.destination?.address,
    date: departureDate.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }),
    departTime: departTimeStr,
    arriveTime: arriveTimeStr,
    duration: "3h 00m",
    price: apiRide.price,
    seatsAvailable: apiRide.seatsAvailable,
    womenOnly: apiRide.womenOnly || false,
    instantBook: apiRide.instantBook || false,
    status: apiRide.status || "active",
    driver: {
      id: driver._id || driver.id || null,
      name: driver.name || "Verified Driver",
      initials: initials,
      trustScore: driver.trustScore || 85,
      rating: 4.8,
      trips: 12,
      verified: driver.isVerified ? ["Govt ID", "Face match"] : ["Govt ID"],
      car: "Verified Vehicle",
      joined: "2026",
      profilePhoto: driver.profilePhoto,
    },
    stops: Array.isArray(apiRide.stops) && apiRide.stops.length > 0
      ? apiRide.stops.map(s => getShortAddress(s.address))
      : apiRide.route || [],
    rawStops: apiRide.stops || [],
    perks: ["Live tracking", "AC"],
  };
}
