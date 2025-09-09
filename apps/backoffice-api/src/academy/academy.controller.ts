import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AcademyService } from './academy.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JWTAuthGuard } from '../auth/jwt/jwt-auth.guard';

@Controller('academy')
export class AcademyController {
  constructor(private readonly academyService: AcademyService) {}

  @Get('courses')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  courses() {
    return this.academyService.getCourses();
  }

  @Get('courses/:idCourse')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  coursesbyid(@Param('idCourse') idCourse: string) {
    return this.academyService.getCourse(idCourse);
  }

  @Get('courses/:idCourse/sections')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  sectionscourse(@Param('idCourse') idCourse: string) {
    return this.academyService.getSections(idCourse);
  }

  @Get('courses/:idCourse/sections/:idSection')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  sectionbyid(
    @Param('idCourse') idCourse: string,
    @Param('idSection') idSection: string,
  ) {
    return this.academyService.getSection(idCourse, idSection);
  }

  @Get('courses/:idCourse/sections/:idSection/lessons')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  lessonsectioncourse(
    @Param('idCourse') idCourse: string,
    @Param('idSection') idSection: string,
  ) {
    return this.academyService.getLessons(idCourse, idSection);
  }

  @Get('courses/:idCourse/sections/:idSection/lessons/:idLesson')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  lessonbyid(
    @Param('idCourse') idCourse: string,
    @Param('idSection') idSection: string,
    @Param('idLesson') idLesson: string,
  ) {
    return this.academyService.getLesson(idCourse, idSection, idLesson);
  }
}
