from django.db import migrations
from django.db.models import F, Max


def add_blog_navigation(apps, schema_editor):
    NavigationBar = apps.get_model('judge', 'NavigationBar')
    if NavigationBar.objects.filter(key='blog').exists():
        return

    next_root = NavigationBar.objects.filter(parent__isnull=True, order__gt=4).order_by('tree_id').first()
    if next_root is None:
        tree_id = (NavigationBar.objects.aggregate(value=Max('tree_id'))['value'] or 0) + 1
    else:
        tree_id = next_root.tree_id
        NavigationBar.objects.filter(tree_id__gte=tree_id).update(tree_id=F('tree_id') + 1)

    NavigationBar.objects.create(
        order=4,
        key='blog',
        label='Blogs',
        path='/blogs/',
        regex=r'^/blogs?/|^/post/',
        lft=1,
        rght=2,
        tree_id=tree_id,
        level=0,
        parent=None,
    )


class Migration(migrations.Migration):
    dependencies = [
        ('judge', '0152_deactivate_user_permission'),
    ]

    operations = [
        migrations.RunPython(add_blog_navigation, migrations.RunPython.noop),
    ]
