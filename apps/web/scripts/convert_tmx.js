const fs = require('fs');
const xml = fs.readFileSync('c:/Users/maxim/CascadeProjects/midforge/apps/web/public/assets/maps/midforge_world.tmx', 'utf8');

const tmj = {
  compressionlevel: -1,
  height: 64,
  infinite: false,
  layers: [],
  nextlayerid: 10,
  nextobjectid: 61,
  orientation: 'orthogonal',
  renderorder: 'right-down',
  tiledversion: '1.10.2',
  tileheight: 16,
  tilewidth: 16,
  type: 'map',
  version: '1.10',
  width: 64,
  tilesets: [{
    firstgid: 1,
    columns: 12,
    image: '../../tilesets/tiny-town/Tilemap/tilemap_packed.png',
    imageheight: 187,
    imagewidth: 203,
    margin: 0,
    name: 'tiles_town',
    spacing: 1,
    tilecount: 132,
    tileheight: 16,
    tilewidth: 16,
  }],
  properties: [
    { name: 'worldName', type: 'string', value: 'Forge Village' },
    { name: 'cameraZoom', type: 'float', value: 2.5 },
  ],
};

// Extract CSV data from tile layers
const layerRegex = /<layer id="(\d+)" name="([^"]+)" width="(\d+)" height="(\d+)"[^>]*>\s*<data encoding="csv">\s*([\s\S]*?)\s*<\/data>\s*<\/layer>/g;
let match;
while ((match = layerRegex.exec(xml)) !== null) {
  const [, id, name, width, height, csvData] = match;
  const data = csvData.split(',').map(s => parseInt(s.trim()));
  tmj.layers.push({
    data,
    height: parseInt(height),
    id: parseInt(id),
    name,
    opacity: name === 'Collision' ? 0 : 1,
    type: 'tilelayer',
    visible: name !== 'Collision',
    width: parseInt(width),
    x: 0,
    y: 0,
  });
}

// Extract object groups
const objGroupRegex = /<objectgroup id="(\d+)" name="([^"]+)">\s*([\s\S]*?)\s*<\/objectgroup>/g;
while ((match = objGroupRegex.exec(xml)) !== null) {
  const [, id, name, content] = match;
  const objects = [];
  const objRegex = /<object id="(\d+)" name="([^"]+)" type="([^"]+)" x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"\/>/g;
  let objMatch;
  while ((objMatch = objRegex.exec(content)) !== null) {
    objects.push({
      height: parseFloat(objMatch[7]),
      id: parseInt(objMatch[1]),
      name: objMatch[2],
      rotation: 0,
      type: objMatch[3],
      visible: true,
      width: parseFloat(objMatch[6]),
      x: parseFloat(objMatch[4]),
      y: parseFloat(objMatch[5]),
    });
  }
  tmj.layers.push({
    draworder: 'topdown',
    id: parseInt(id),
    name,
    objects,
    opacity: 1,
    type: 'objectgroup',
    visible: true,
    x: 0,
    y: 0,
  });
}

fs.writeFileSync('c:/Users/maxim/CascadeProjects/midforge/apps/web/public/assets/maps/midforge_world.tmj', JSON.stringify(tmj, null, 2));
console.log('TMJ created with', tmj.layers.length, 'layers');
tmj.layers.forEach(l => console.log(' -', l.name, l.type, l.type === 'objectgroup' ? l.objects.length + ' objects' : l.data ? l.data.length + ' tiles' : ''));
