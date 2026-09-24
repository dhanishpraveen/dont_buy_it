export type ItemAvailability = 'Available' | 'Borrowed' | 'Coming soon';
export type ItemCondition = 'Like new' | 'Good' | 'Well loved';

export type MockItem = {
    id: string;
    name: string;
    category: string;
    image: string;
    gallery: string[];
    owner: string;
    ownerInitials: string;
    ownerTrust: number;
    ownerNote: string;
    location: string;
    distance: number;
    condition: ItemCondition;
    availability: ItemAvailability;
    status: string;
    popularity: number;
    addedDaysAgo: number;
    description: string;
    specifications: { label: string; value: string }[];
};

const image = (id: string, width = 900, height = 700) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&h=${height}&q=82`;

export const mockItems: MockItem[] = [
    {
        id: 'canon-dslr-camera', name: 'Canon DSLR Camera', category: 'Electronics', image: image('photo-1516035069371-29a1b244cc32'), gallery: [image('photo-1516035069371-29a1b244cc32'), image('photo-1516724562728-afc824a36e84'), image('photo-1516035069371-29a1b244cc32')], owner: 'Aarav Menon', ownerInitials: 'AM', ownerTrust: 4.9, ownerNote: 'Happy to share with someone who is trying photography for the first time.', location: 'Adyar, Chennai', distance: 2.4, condition: 'Like new', availability: 'Available', status: 'Ready to borrow', popularity: 92, addedDaysAgo: 2, description: 'A beginner-friendly DSLR for weekend projects, family events, or getting to know the craft.', specifications: [{ label: 'Model', value: 'Canon EOS 200D II' }, { label: 'Lens', value: '18-55mm kit lens' }, { label: 'Includes', value: 'Battery, charger, 32GB card' }],
    },
    {
        id: 'camping-tent', name: 'Two-person Camping Tent', category: 'Outdoor & Sports', image: image('photo-1504280390367-361c6d9f38f4'), gallery: [image('photo-1504280390367-361c6d9f38f4'), image('photo-1475483768296-6163e08872a1'), image('photo-1500534623283-312aade485b7')], owner: 'Meera S.', ownerInitials: 'MS', ownerTrust: 4.8, ownerNote: 'Used on three weekend trips and packed clean after every one.', location: 'Besant Nagar, Chennai', distance: 4.1, condition: 'Good', availability: 'Available', status: 'Ready to borrow', popularity: 86, addedDaysAgo: 5, description: 'A lightweight tent for two, with a quick setup that makes a first camping trip feel easy.', specifications: [{ label: 'Capacity', value: '2 people' }, { label: 'Weight', value: '2.6 kg' }, { label: 'Includes', value: 'Rainfly and carry bag' }],
    },
    {
        id: 'cs-textbooks', name: 'CS Textbooks Bundle', category: 'Books', image: image('photo-1532012197267-da84d127e765'), gallery: [image('photo-1532012197267-da84d127e765'), image('photo-1544947950-fa07a98d237f')], owner: 'Rohan Iyer', ownerInitials: 'RI', ownerTrust: 4.7, ownerNote: 'Prefer lending as a bundle to students nearby.', location: 'T. Nagar, Chennai', distance: 5.2, condition: 'Well loved', availability: 'Borrowed', status: 'Available from 12 Oct', popularity: 78, addedDaysAgo: 12, description: 'Core computer science texts for a semester of study, including algorithms and databases.', specifications: [{ label: 'Books', value: '4 titles' }, { label: 'Edition', value: 'Latest available' }, { label: 'Format', value: 'Paperback' }],
    },
    {
        id: 'bosch-drill', name: 'Bosch Drill Machine', category: 'Tools', image: image('photo-1504148455328-c376907d081c'), gallery: [image('photo-1504148455328-c376907d081c'), image('photo-1586864387967-d02ef85d93e8')], owner: 'Nikhil Kumar', ownerInitials: 'NK', ownerTrust: 4.9, ownerNote: 'Includes the common bits you need for small home projects.', location: 'Velachery, Chennai', distance: 7.8, condition: 'Like new', availability: 'Available', status: 'Ready to borrow', popularity: 97, addedDaysAgo: 1, description: 'A compact cordless drill for shelves, repairs, and small weekend projects around the home.', specifications: [{ label: 'Power', value: '12V cordless' }, { label: 'Speed', value: '2-speed gearbox' }, { label: 'Includes', value: 'Drill bits and case' }],
    },
    {
        id: 'projector', name: 'Portable Projector', category: 'Electronics', image: image('photo-1626379953822-baec19c3accd'), gallery: [image('photo-1626379953822-baec19c3accd'), image('photo-1492724441997-5dc865305da7')], owner: 'Priya K.', ownerInitials: 'PK', ownerTrust: 4.6, ownerNote: 'Great for movie nights and small presentations.', location: 'Anna Nagar, Chennai', distance: 8.5, condition: 'Good', availability: 'Coming soon', status: 'Available from 18 Oct', popularity: 71, addedDaysAgo: 18, description: 'A small projector that travels easily between living rooms, classrooms, and community spaces.', specifications: [{ label: 'Resolution', value: '1080p supported' }, { label: 'Brightness', value: '3500 lumens' }, { label: 'Includes', value: 'HDMI cable and remote' }],
    },
    {
        id: 'ergonomic-chair', name: 'Ergonomic Chair', category: 'Furniture', image: image('photo-1586023492125-27b2c045efd7'), gallery: [image('photo-1586023492125-27b2c045efd7'), image('photo-1592078615290-033ee584e267')], owner: 'Vikram Rao', ownerInitials: 'VR', ownerTrust: 4.8, ownerNote: 'Available while I am working from another city.', location: 'Nungambakkam, Chennai', distance: 3.7, condition: 'Good', availability: 'Available', status: 'Ready to borrow', popularity: 84, addedDaysAgo: 8, description: 'A supportive desk chair for a focused work week or a short home office setup.', specifications: [{ label: 'Adjustments', value: 'Height and tilt' }, { label: 'Material', value: 'Mesh back' }, { label: 'Pickup', value: 'Building lobby' }],
    },
    {
        id: 'badminton-racket', name: 'Badminton Racket Set', category: 'Outdoor & Sports', image: image('photo-1626224583764-f87db24ac4ea'), gallery: [image('photo-1626224583764-f87db24ac4ea'), image('photo-1595435934249-5df7ed86e1c0')], owner: 'Ananya Bose', ownerInitials: 'AB', ownerTrust: 4.7, ownerNote: 'Two rackets included, so bring a friend.', location: 'Mylapore, Chennai', distance: 1.9, condition: 'Good', availability: 'Available', status: 'Ready to borrow', popularity: 89, addedDaysAgo: 3, description: 'A pair of light rackets for a casual game at the park or your neighborhood court.', specifications: [{ label: 'Set', value: '2 rackets' }, { label: 'Level', value: 'Recreational' }, { label: 'Includes', value: '3 shuttlecocks' }],
    },
    {
        id: 'air-fryer', name: 'Compact Air Fryer', category: 'Home & Kitchen', image: image('photo-1585515320310-259814833e62'), gallery: [image('photo-1585515320310-259814833e62')], owner: 'Devika Shah', ownerInitials: 'DS', ownerTrust: 4.5, ownerNote: 'Cleaned and ready for a short-term kitchen experiment.', location: 'Kotturpuram, Chennai', distance: 6.4, condition: 'Good', availability: 'Available', status: 'Ready to borrow', popularity: 68, addedDaysAgo: 20, description: 'Try out air frying without committing to another kitchen appliance.', specifications: [{ label: 'Capacity', value: '4.2 litres' }, { label: 'Power', value: '1400 watts' }, { label: 'Controls', value: 'Digital presets' }],
    },
    {
        id: 'sewing-machine', name: 'Portable Sewing Machine', category: 'Other', image: image('photo-1558618666-fcd25c85cd64'), gallery: [image('photo-1558618666-fcd25c85cd64')], owner: 'Lakshmi Nair', ownerInitials: 'LN', ownerTrust: 4.9, ownerNote: 'Happy to share a quick setup guide with the machine.', location: 'Royapettah, Chennai', distance: 4.8, condition: 'Like new', availability: 'Available', status: 'Ready to borrow', popularity: 61, addedDaysAgo: 25, description: 'A small machine for repairs, alterations, and learning the basics of sewing.', specifications: [{ label: 'Type', value: 'Electric portable' }, { label: 'Stitches', value: '12 patterns' }, { label: 'Includes', value: 'Foot pedal and kit' }],
    },
    {
        id: 'yoga-mat', name: 'Cork Yoga Mat', category: 'Outdoor & Sports', image: image('photo-1601925260368-ae2f83cf8b7f'), gallery: [image('photo-1601925260368-ae2f83cf8b7f')], owner: 'Kavya R.', ownerInitials: 'KR', ownerTrust: 4.6, ownerNote: 'Ideal for someone trying a few classes before buying their own.', location: 'Guindy, Chennai', distance: 9.1, condition: 'Good', availability: 'Borrowed', status: 'Available from 5 Oct', popularity: 55, addedDaysAgo: 30, description: 'A grippy cork mat for home practice, studio classes, or a weekend reset.', specifications: [{ label: 'Length', value: '183 cm' }, { label: 'Material', value: 'Natural cork' }, { label: 'Thickness', value: '5 mm' }],
    },
    {
        id: 'folding-table', name: 'Folding Work Table', category: 'Furniture', image: image('photo-1531835551805-16d864c8d311'), gallery: [image('photo-1531835551805-16d864c8d311')], owner: 'Arjun S.', ownerInitials: 'AS', ownerTrust: 4.4, ownerNote: 'Useful for pop-ups, events, or an occasional home project.', location: 'Perungudi, Chennai', distance: 11.3, condition: 'Well loved', availability: 'Available', status: 'Ready to borrow', popularity: 49, addedDaysAgo: 35, description: 'A sturdy folding table that is easy to carry and useful beyond a single event.', specifications: [{ label: 'Size', value: '4 x 2 feet' }, { label: 'Weight', value: '8 kg' }, { label: 'Material', value: 'Powder-coated steel' }],
    },
    {
        id: 'bluetooth-speaker', name: 'Bluetooth Speaker', category: 'Electronics', image: image('photo-1608043152269-423dbba4e7e1'), gallery: [image('photo-1608043152269-423dbba4e7e1')], owner: 'Farah Ahmed', ownerInitials: 'FA', ownerTrust: 4.8, ownerNote: 'Great for a gathering, picnic, or small community event.', location: 'Thiruvanmiyur, Chennai', distance: 5.9, condition: 'Like new', availability: 'Available', status: 'Ready to borrow', popularity: 75, addedDaysAgo: 6, description: 'A clear, portable speaker for a little more sound at your next shared moment.', specifications: [{ label: 'Battery', value: '12 hours' }, { label: 'Waterproof', value: 'IPX7' }, { label: 'Connection', value: 'Bluetooth 5.0' }],
    },
];

export const itemCategories = ['Tools', 'Books', 'Electronics', 'Outdoor & Sports', 'Furniture', 'Home & Kitchen', 'Other'];