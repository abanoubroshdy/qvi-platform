import { qv1Release } from "@/lib/qv1-release";

export type Qv1ChangelogEntry = {
  version: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  notes: {
    en: readonly string[];
    ar: readonly string[];
  };
};

/** Release notes rendered on /qv1. Kept beside the release record, not in marketing copy. */
export const qv1Changelog: readonly Qv1ChangelogEntry[] = [
  {
    version: qv1Release.version,
    date: qv1Release.releaseDate,
    notes: {
      en: [
        "QV1 Evaluation for Windows. AI separation produces 4 stems: vocals, drums, bass, and other.",
        "Weights are BS-RoFormer from ZFTurbo (Music-Source-Separation-Training, release v1.0.12), converted by QVI from .ckpt to ONNX. They are third-party and non-commercial. They are not in the installer. Model Manager downloads them after you accept the non-commercial notice.",
        "Drum Split (DSP) into Kick, Snare, Hi-hat, and Other Drums works on any drum track. With stem editing, DSP processing, the mixer, mix export, and projects, it is QVI’s own code and stays in Pro. Not in this build.",
      ],
      ar: [
        "QV1 Evaluation لويندوز. فصل الذكاء الاصطناعي ينتج 4 ستيمز: غناء، طبول، باس، وأخرى.",
        "الأوزان هي BS-RoFormer من ZFTurbo (Music-Source-Separation-Training، الإصدار v1.0.12)، حوّلتها QVI من ‎.ckpt إلى ONNX. هي من طرف ثالث وغير تجارية، وليست داخل المثبّت. ينزّلها مدير النماذج بعد قبول إشعار الاستخدام غير التجاري.",
        "فصل الطبول (DSP) إلى كيك وسنير وهاي-هات وطبول أخرى يعمل على أي مسار طبول. ومع تحرير الستيمز ومعالجة DSP والمكسر وتصدير المزيج والمشاريع، هو كود QVI ويبقى في Pro. ليس في هذا الإصدار.",
      ],
    },
  },
];
