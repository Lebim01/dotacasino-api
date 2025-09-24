import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AcademyService } from './academy.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@security/jwt.guard';

@Controller('academy')
export class AcademyController {
  constructor(private readonly academyService: AcademyService) {}

  @Get('courses')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  courses() {
    return this.academyService.getCourses();
  }

  @Get('courses/:idCourse')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  coursesbyid(@Param('idCourse') idCourse: string) {
    return this.academyService.getCourse(idCourse);
  }

  @Get('courses/:idCourse/sections')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  sectionscourse(@Param('idCourse') idCourse: string) {
    return this.academyService.getSections(idCourse);
  }

  @Get('courses/:idCourse/sections/:idSection')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  sectionbyid(
    @Param('idCourse') idCourse: string,
    @Param('idSection') idSection: string,
  ) {
    return this.academyService.getSection(idCourse, idSection);
  }

  @Get('courses/:idCourse/sections/:idSection/lessons')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  lessonsectioncourse(
    @Param('idCourse') idCourse: string,
    @Param('idSection') idSection: string,
  ) {
    return this.academyService.getLessons(idCourse, idSection);
  }

  @Get('courses/:idCourse/sections/:idSection/lessons/:idLesson')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  lessonbyid(
    @Param('idCourse') idCourse: string,
    @Param('idSection') idSection: string,
    @Param('idLesson') idLesson: string,
  ) {
    return this.academyService.getLesson(idCourse, idSection, idLesson);
  }
}
