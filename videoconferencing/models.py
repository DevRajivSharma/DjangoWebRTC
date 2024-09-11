from django.db import models

# Create your models here.
class streams_data(models.Model):
    room_name = models.CharField(max_length=10),
    username = models.CharField(max_length=50)

    def __str__(this):
       return f"{this.room_name} {this.username}"
    

