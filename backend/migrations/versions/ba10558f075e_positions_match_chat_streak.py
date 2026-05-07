"""positions_match_chat_streak

Revision ID: ba10558f075e
Revises: 2817b0395e39
Create Date: 2026-05-04 22:52:21.867045

"""
from alembic import op
import sqlalchemy as sa


revision = 'ba10558f075e'
down_revision = '2817b0395e39'
branch_labels = None
depends_on = None


def _column_exists(table, col):
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return any(c["name"] == col for c in insp.get_columns(table))


def _table_exists(table):
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return table in insp.get_table_names()


def upgrade():
    if not _table_exists('match_position_slots'):
        op.create_table(
            'match_position_slots',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('match_id', sa.Integer(), nullable=False),
            sa.Column('position', sa.String(length=20), nullable=False),
            sa.Column('total_slots', sa.Integer(), nullable=False),
            sa.Column('filled_slots', sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(['match_id'], ['matches.id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('match_id', 'position'),
        )

    if not _column_exists('join_requests', 'requested_position'):
        with op.batch_alter_table('join_requests', schema=None) as batch_op:
            batch_op.add_column(sa.Column('requested_position', sa.String(length=20), nullable=True))

    if not _column_exists('match_players', 'assigned_position'):
        with op.batch_alter_table('match_players', schema=None) as batch_op:
            batch_op.add_column(sa.Column('assigned_position', sa.String(length=20), nullable=True))

    if not _column_exists('messages', 'match_id'):
        with op.batch_alter_table('messages', schema=None) as batch_op:
            batch_op.add_column(sa.Column('match_id', sa.Integer(), nullable=True))
            batch_op.alter_column('receiver_id', existing_type=sa.INTEGER(), nullable=True)
            batch_op.create_index('ix_messages_match', ['match_id'], unique=False)
            batch_op.create_foreign_key('fk_messages_match_id', 'matches', ['match_id'], ['id'])

    if not _column_exists('users', 'favorite_position'):
        with op.batch_alter_table('users', schema=None) as batch_op:
            batch_op.add_column(sa.Column('favorite_position', sa.String(length=20), nullable=True))


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('favorite_position')
    with op.batch_alter_table('messages', schema=None) as batch_op:
        batch_op.drop_constraint('fk_messages_match_id', type_='foreignkey')
        batch_op.drop_index('ix_messages_match')
        batch_op.alter_column('receiver_id', existing_type=sa.INTEGER(), nullable=False)
        batch_op.drop_column('match_id')
    with op.batch_alter_table('match_players', schema=None) as batch_op:
        batch_op.drop_column('assigned_position')
    with op.batch_alter_table('join_requests', schema=None) as batch_op:
        batch_op.drop_column('requested_position')
    op.drop_table('match_position_slots')
