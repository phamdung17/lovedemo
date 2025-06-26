console.clear();

// Tạo scene, camera, renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
});
renderer.setClearColor(new THREE.Color("rgb(0,0,0)"));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Vị trí camera
camera.position.z = 5;

// Controls
const controls = new THREE.TrackballControls(camera, renderer.domElement);
controls.noPan = true;
controls.maxDistance = 8;
controls.minDistance = 1;

// Group chính
const mainGroup = new THREE.Group();
scene.add(mainGroup);

// Simplex noise instance
const simplex = new SimplexNoise();

// ===== TẠO DẢI NGÂN HÀ =====
function createGalaxy() {
  const parameters = {
    count: 50000,
    size: 0.01,
    radius: 5,
    branches: 3,
    spin: 1,
    randomness: 0.2,
    randomnessPower: 3,
    insideColor: '#ff6030',
    outsideColor: '#1b3984'
  };

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(parameters.count * 3);
  const colors = new Float32Array(parameters.count * 3);

  const colorInside = new THREE.Color(parameters.insideColor);
  const colorOutside = new THREE.Color(parameters.outsideColor);

  for (let i = 0; i < parameters.count; i++) {
    const i3 = i * 3;

    // Position
    const radius = Math.random() * parameters.radius;
    const spinAngle = radius * parameters.spin;
    const branchAngle = (i % parameters.branches) / parameters.branches * Math.PI * 2;

    const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
    const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
    const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;

    positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
    positions[i3 + 1] = randomY;
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

    // Color
    const mixedColor = colorInside.clone();
    mixedColor.lerp(colorOutside, radius / parameters.radius);

    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: parameters.size,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true
  });

  return new THREE.Points(geometry, material);
}

const galaxy = createGalaxy();
mainGroup.add(galaxy);

// ===== KIỂM TRA ĐIỂM TRONG TRÁI TIM =====
function isInsideHeart(x, y, z) {
  // Chuyển về tọa độ 2D để kiểm tra
  const scale = 20; // Điều chỉnh kích thước
  const x2d = x * scale;
  const y2d = y * scale;

  // Phương trình trái tim: (x²+y²-1)³ - x²y³ <= 0
  const heartEq = Math.pow((x2d * x2d + y2d * y2d - 1), 3) - x2d * x2d * y2d * y2d * y2d;

  // // Cho phép một chút độ dày theo trục Z
  const zThickness = 0.1;
  return heartEq <= 0 && Math.abs(z) <= zThickness;
}

// ===== TẠO PARTICLES TRÁI TIM DENSE =====
const heartParticles = {
  positions: [],
  colors: [],
  geometry: new THREE.BufferGeometry(),
  material: new THREE.PointsMaterial({
    vertexColors: true,
    size: 0.02,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  }),
  points: null
};

const palette = [
  new THREE.Color("#ff69b4"), // Hot pink
  new THREE.Color("#ff1493"), // Deep pink  
  new THREE.Color("#ff6347"), // Tomato
  new THREE.Color("#ff4500"), // Orange red
  new THREE.Color("#dc143c"), // Crimson
  new THREE.Color("#b22222")  // Fire brick
];

class HeartSparkle {
  constructor() {
    // Tạo vị trí ngẫu nhiên và kiểm tra xem có nằm trong trái tim không
    let attempts = 0;
    let validPosition = false;

    while (!validPosition && attempts < 100) {
      // Tạo vị trí trong bounding box của trái tim
      const x = (Math.random() - 0.5) * 1.2;
      const y = (Math.random() - 0.5) * 1.0;
      const z = (Math.random() - 0.5) * 0.6;

      if (isInsideHeart(x, y, z)) {
        this.pos = new THREE.Vector3(x, y, z);
        this.originalPos = this.pos.clone();
        validPosition = true;
      }
      attempts++;
    }

    // Nếu không tìm được vị trí hợp lệ, dùng phương trình parametric
    if (!validPosition) {
      const t = Math.random() * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

      this.pos = new THREE.Vector3(
        x * 0.02,
        y * 0.02,
        (Math.random() - 0.5) * 0.3
      );
      this.originalPos = this.pos.clone();
    }

    this.color = palette[Math.floor(Math.random() * palette.length)];
    this.rand = Math.random() * 0.03;
    this.baseSize = 0.8 + Math.random() * 0.4; // Kích thước cơ bản ngẫu nhiên
  }

  update(time, beat) {
    const noise = simplex.noise4D(
      this.originalPos.x * 3,
      this.originalPos.y * 3,
      this.originalPos.z * 3,
      time * 0.0002
    ) + 1;

    const noise2 = simplex.noise4D(
      this.originalPos.x * 8,
      this.originalPos.y * 8,
      this.originalPos.z * 8,
      time * 0.0008
    ) + 1;

    // Tăng cường hiệu ứng beat
    const beatEffect = beat.a * 0.3 + 0.7; // 0.7 đến 1.0
    const scale = beatEffect + noise * 0.1 + noise2 * 0.05;

    this.pos = this.originalPos.clone().multiplyScalar(scale);

    // Thay đổi màu sắc dựa trên beat
    const colorIntensity = beat.a * 0.5 + 0.5;
    this.color.multiplyScalar(colorIntensity).add(
      new THREE.Color(beat.a * 0.2, 0, beat.a * 0.1)
    );
  }
}

// Tạo nhiều particles hơn để phủ kín trái tim
const heartSparkles = [];
for (let i = 0; i < 8000; i++) {
  heartSparkles.push(new HeartSparkle());
}

heartParticles.points = new THREE.Points(heartParticles.geometry, heartParticles.material);
mainGroup.add(heartParticles.points);

// ===== ANIMATION BEAT MẠNH HƠN =====
const beat = { a: 0 };

gsap.timeline({
  repeat: -1,
  repeatDelay: 0.3,
})
  .to(beat, {
    a: 1.0,
    duration: 0.4,
    ease: "power2.in",
  })
  .to(beat, {
    a: 0.0,
    duration: 0.8,
    ease: "power3.out",
  });

// ===== RENDER LOOP =====
function animate(time) {
  // Cập nhật heart particles
  heartParticles.positions = [];
  heartParticles.colors = [];

  heartSparkles.forEach((sparkle, i) => {
    sparkle.update(time, beat);

    heartParticles.positions.push(
      sparkle.pos.x,
      sparkle.pos.y,
      sparkle.pos.z
    );

    heartParticles.colors.push(
      sparkle.color.r,
      sparkle.color.g,
      sparkle.color.b
    );
  });

  heartParticles.geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(heartParticles.positions), 3)
  );
  heartParticles.geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(new Float32Array(heartParticles.colors), 3)
  );

  // Xoay galaxy
  galaxy.rotation.y = time * 0.00005;

  // Xoay trái tim chậm hơn để quan sát rõ hơn
  mainGroup.rotation.y = time * 0.00005;

  // Cập nhật controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}

// ===== EVENT LISTENERS =====
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Bắt đầu animation
animate(0);