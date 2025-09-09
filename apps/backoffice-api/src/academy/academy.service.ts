import { Injectable } from '@nestjs/common';
import { db } from '../firebase/admin';

@Injectable()
export class AcademyService {
  async getCourses() {
    const courses = await db
      .collection('courses')
      .where('is_multi', '==', true)
      .get();
    return courses.docs.map((r) => ({
      ...r.data(),
      id: r.id,
    }));
  }

  async getSections(courseId: string) {
    const sections = await db
      .collection('courses')
      .doc(courseId)
      .collection('sections')
      .orderBy('order', 'asc')
      .get();
    return sections.docs.map((r) => ({
      ...r.data(),
      id: r.id,
    }));
  }

  async getLessons(courseId: string, sectionId: string) {
    const lessons = await db
      .collection('courses')
      .doc(courseId)
      .collection('sections')
      .doc(sectionId)
      .collection('lessons')
      .orderBy('order', 'asc')
      .get();
    return lessons.docs.map((r) => ({
      ...r.data(),
      id: r.id,
    }));
  }

  async getCourse(courseId: string) {
    const course = await db.collection('courses').doc(courseId).get();
    return {
      ...course.data(),
      id: course.id,
    };
  }

  async getSection(courseId: string, sectionId: string) {
    const section = await db
      .collection('courses')
      .doc(courseId)
      .collection('sections')
      .doc(sectionId)
      .get();
    return {
      ...section.data(),
      id: section.id,
    };
  }

  async getLesson(courseId: string, sectionId: string, lessonId: string) {
    const lesson = await db
      .collection('courses')
      .doc(courseId)
      .collection('sections')
      .doc(sectionId)
      .collection('lessons')
      .doc(lessonId)
      .get();
    return {
      ...lesson.data(),
      id: lesson.id,
    };
  }
}
