import { Injectable } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';

@Injectable()
export class AcademyService {
  constructor(private readonly prisma: PrismaService) {}

  async getCourses() {
    const courses = await this.prisma.course.findMany({
      include: {
        category: true,
      }
    });
    return courses;
  }

  async getSections(courseId: string) {
    const sections = await this.prisma.courseSection.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
    });
    return sections;
  }

  async getLessons(courseId: string, sectionId: string) {
    const lessons = await this.prisma.lesson.findMany({
      where: { sectionId },
      orderBy: { order: 'asc' },
    });
    return lessons;
  }

  async getCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          include: {
            lessons: true,
          },
        },
      },
    });
    return course;
  }

  async getSection(courseId: string, sectionId: string) {
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
    });
    return section;
  }

  async getLesson(courseId: string, sectionId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    return lesson;
  }
}
