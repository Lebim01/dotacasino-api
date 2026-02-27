import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const exportPath = path.join(__dirname, '..', 'courses_full_export.json');
  if (!fs.existsSync(exportPath)) {
    console.error('Export file not found at:', exportPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(exportPath, 'utf8');
  const coursesData = JSON.parse(rawData);

  console.log('Cleaning up existing data...');
  await prisma.lesson.deleteMany({});
  await prisma.courseSection.deleteMany({});
  await prisma.course.deleteMany({});

  console.log(`Starting import of ${coursesData.length} courses...`);

  for (const exp of coursesData) {
    const langs = Array.isArray(exp.lang) ? exp.lang : [exp.lang];
    
    for (const lang of langs) {
      if (!lang) continue;

      const title = typeof exp.name === 'object' ? (exp.name[lang] || exp.name['es'] || exp.name['en']) : exp.name;
      const description = typeof exp.description === 'object' ? (exp.description[lang] || exp.description['es'] || exp.description['en']) : (exp.description || "");
      const thumbnailUrl = typeof exp.img_url === 'object' ? (exp.img_url[lang] || exp.img_url['es'] || exp.img_url['en']) : exp.img_url;

      // Unique ID for each language version
      const courseId = `${exp.id}_${lang}`;

      console.log(`- Importing Course: ${title} (${lang}) -> ID: ${courseId}`);

      await prisma.course.upsert({
        where: { id: courseId },
        update: {
          title: title || "Untitled",
          description,
          thumbnailUrl,
          lang,
          status: exp.status || "in_progress",
          countLesson: exp.count_lesson || 0,
          countLikes: exp.count_likes || 0,
          countViews: exp.count_views || 0,
          categoryId: "default", // Using default category
        },
        create: {
          id: courseId,
          title: title || "Untitled",
          description,
          thumbnailUrl,
          lang,
          status: exp.status || "in_progress",
          countLesson: exp.count_lesson || 0,
          countLikes: exp.count_likes || 0,
          countViews: exp.count_views || 0,
          categoryId: "default",
        },
      });

      // Import Sections
      if (exp.sections && Array.isArray(exp.sections)) {
        for (const sec of exp.sections) {
          const secTitle = typeof sec.name === 'object' ? (sec.name[lang] || sec.name['es'] || sec.name['en']) : sec.name;
          const sectionId = `${sec.id}_${lang}`;

          await prisma.courseSection.upsert({
            where: { id: sectionId },
            update: {
              title: secTitle || "Untitled Section",
              order: sec.order || 0,
              countLessons: sec.count_lessons || 0,
              courseId: courseId,
            },
            create: {
              id: sectionId,
              title: secTitle || "Untitled Section",
              order: sec.order || 0,
              countLessons: sec.count_lessons || 0,
              courseId: courseId,
            },
          });

          // Import Lessons
          if (sec.lessons && Array.isArray(sec.lessons)) {
            for (const les of sec.lessons) {
              const lesTitle = typeof les.name === 'object' ? (les.name[lang] || les.name['es'] || les.name['en']) : les.name;
              const lessonId = `${les.id}_${lang}`;

              // Extract video URL from iframe if necessary
              let videoUrl = "";
              const iframe = typeof les.iframe === 'object' ? (les.iframe[lang] || les.iframe['es'] || les.iframe['en']) : les.iframe;
              if (iframe) {
                  const match = iframe.match(/src="([^"]+)"/);
                  videoUrl = match ? match[1] : iframe;
              }

              await prisma.lesson.upsert({
                where: { id: lessonId },
                update: {
                  title: lesTitle || "Untitled Lesson",
                  videoUrl: videoUrl,
                  content: les.content || "",
                  order: les.order || 0,
                  countLikes: les.count_likes || 0,
                  countViews: les.count_views || 0,
                  sectionId: sectionId,
                },
                create: {
                  id: lessonId,
                  title: lesTitle || "Untitled Lesson",
                  videoUrl: videoUrl,
                  content: les.content || "",
                  order: les.order || 0,
                  countLikes: les.count_likes || 0,
                  countViews: les.count_views || 0,
                  sectionId: sectionId,
                },
              });
            }
          }
        }
      }
    }
  }

  console.log('Import completed successfully!');
}

main()
  .catch(e => {
    console.error('Error during import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
