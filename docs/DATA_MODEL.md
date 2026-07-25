# DATA MODEL

ProjectGroup(id,name,description)

Project(id,groupId,name,description)

Task(
id,projectId,title,description,
priority,status,startTime,finishTime,
workHours,remark
)

Leave(id,date,type,hours,remark)

Config(monthStartDay,monthEndDay,dataPath)
