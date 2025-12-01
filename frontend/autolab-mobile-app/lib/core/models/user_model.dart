import 'package:json_annotation/json_annotation.dart';

part 'user_model.g.dart';

@JsonSerializable()
class UserModel {
  final String id;
  final String name;
  final String email;
  final String role;
  final bool? isSuspended;
  final DateTime? suspendedAt;
  final String? suspendReason;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.isSuspended,
    this.suspendedAt,
    this.suspendReason,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) =>
      _$UserModelFromJson(json);

  Map<String, dynamic> toJson() => _$UserModelToJson(this);
}


