/** Dim relief-map scene the glass tiles frost over. Painted once, never animated. */
export function Backdrop({ image }: { image?: string | null }) {
  return (
    <div className={`scene${image ? " has-img" : ""}`} aria-hidden="true">
      {image && <div className="scene-img" style={{ backgroundImage: `url(${image})` }} />}
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="55" />
          </filter>
        </defs>
        <rect width="1600" height="1000" fill="#0a0a0b" />
        <g filter="url(#soft)">
          <ellipse cx="760" cy="330" rx="420" ry="200" fill="#2c3327" />
          <ellipse cx="1010" cy="520" rx="330" ry="210" fill="#3a3d31" />
          <ellipse cx="560" cy="560" rx="280" ry="170" fill="#22262a" />
          <ellipse cx="1180" cy="250" rx="240" ry="140" fill="#3b3a36" />
          <ellipse cx="240" cy="820" rx="300" ry="160" fill="#3a2414" />
        </g>
        <g fill="none" stroke="#fff" strokeOpacity=".06">
          <path d="M380 240C520 170 700 210 830 170S1100 110 1240 190 1400 330 1320 430 1120 560 980 600 720 690 600 640 380 520 340 420 300 300 380 240Z" />
          <path d="M450 280C570 220 710 250 830 220S1060 170 1180 240 1300 340 1240 420 1080 520 960 550 730 620 630 580 450 490 420 410 390 320 450 280Z" />
          <path d="M530 320C630 270 720 290 830 270S1020 230 1110 290 1200 350 1160 410 1040 480 940 500 740 550 660 520 530 460 510 400 480 350 530 320Z" />
          <path d="M620 360C690 320 740 330 830 320S980 300 1040 340 1090 370 1060 400 990 440 920 450 750 480 700 460 620 430 610 400 590 380 620 360Z" />
        </g>
        <path
          d="M300 700C460 640 560 520 700 470S900 420 1010 360 1200 260 1380 220"
          fill="none"
          stroke="#fff"
          strokeOpacity=".28"
          strokeDasharray="3 9"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
